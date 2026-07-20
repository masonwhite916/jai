/**
 * Real-time dispatch server built on top of the `ws` package.
 *
 * Room naming conventions (unified on Job ID):
 *   "technicians"  – all online authenticated technicians (new_job broadcasts)
 *   "job:{jobId}"  – customer + assigned technician for a specific job
 *
 * Auth protocol:
 *   1. Client sends: { type: "auth", token: "<Bearer token>" }
 *   2. Server responds: { type: "auth_ok", role, userId }
 *      on failure:      { type: "auth_error", error }
 *
 * Room access control:
 *   "technicians"  – technicians only (auto-joined on auth_ok)
 *   "admin"        – admin sessions only (auto-joined on auth_ok for admins)
 *   "job:{jobId}"  – customer who owns the request OR assigned technician
 *                    Pending (unassigned) jobs: any technician may join
 *
 * Location relay:
 *   Technician sends: { type: "location_update", lat, lng, jobId }
 *   Server verifies assignment, then relays:
 *     { type: "tech_location", lat, lng, jobId }          → "job:{jobId}" room
 *     { type: "tech_location_admin", technicianId, lat,
 *       lng, seenAt }                                      → "admin" room
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { IncomingMessage } from "http";
import { db, users, jobs, serviceRequests } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "./logger";
import { setTechLocation } from "./techLocations";
import { validateAdminToken } from "./adminSessions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthedSocket extends WebSocket {
  userId:   number | undefined;
  userRole: string  | undefined;
  isAdmin:  boolean;
  rooms:    Set<string>;
}

export interface DispatchMessage {
  type: string;
  [key: string]: unknown;
}

// ── Dispatch server ───────────────────────────────────────────────────────────

class DispatchServer {
  private wss: WebSocketServer | null = null;
  // room name → set of sockets in that room
  private rooms = new Map<string, Set<AuthedSocket>>();

  /** Attach this WebSocket server to an existing HTTP server. */
  attach(server: HttpServer): void {
    // Path must be "/api/ws" because the Replit proxy routes "/api/*" to this
    // service and forwards the full path unchanged.
    this.wss = new WebSocketServer({ server, path: "/api/ws" });

    this.wss.on("connection", (ws: AuthedSocket, _req: IncomingMessage) => {
      ws.userId   = undefined;
      ws.userRole = undefined;
      ws.isAdmin  = false;
      ws.rooms    = new Set();

      ws.on("message", (raw) => void this.handleMessage(ws, raw));
      ws.on("close",   () => this.cleanup(ws));
      ws.on("error",   (err) => logger.warn({ err }, "WebSocket client error"));
    });

    logger.info("WebSocket dispatch server attached on path /api/ws");
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private send(ws: WebSocket, msg: DispatchMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private async handleMessage(ws: AuthedSocket, raw: unknown): Promise<void> {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
      return;
    }

    switch (msg.type) {
      case "auth": {
        const token = typeof msg.token === "string" ? msg.token : "";
        if (!token) {
          this.send(ws, { type: "auth_error", error: "token required" });
          return;
        }

        // Admin token path — validated against in-memory admin session store
        if (token.startsWith("admin_")) {
          if (!validateAdminToken(token)) {
            this.send(ws, { type: "auth_error", error: "Invalid or expired admin token" });
            return;
          }
          ws.isAdmin  = true;
          ws.userRole = "admin";
          ws.userId   = undefined; // admins have no user-table row
          this.joinRoom(ws, "admin");
          this.send(ws, { type: "auth_ok", role: "admin" });
          break;
        }

        // Regular user (technician / customer) — validate against DB
        const now  = new Date();
        const rows = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(and(eq(users.auth_token, token), gt(users.token_expires_at, now)))
          .limit(1);

        if (!rows.length) {
          this.send(ws, { type: "auth_error", error: "Invalid or expired token" });
          return;
        }

        ws.userId   = rows[0].id;
        ws.userRole = rows[0].role;

        // Technicians auto-join the broadcast room
        if (rows[0].role === "technician") {
          this.joinRoom(ws, "technicians");
        }

        this.send(ws, { type: "auth_ok", role: rows[0].role, userId: rows[0].id });
        break;
      }

      case "join": {
        // Must be authenticated — either a user with userId or an admin session
        if (!ws.userId && !ws.isAdmin) {
          this.send(ws, { type: "error", error: "Not authenticated" });
          return;
        }
        const room = typeof msg.room === "string" ? msg.room : "";

        // Admin room — only admin sessions may join (server already auto-joins on auth)
        if (room === "admin") {
          if (ws.isAdmin) this.joinRoom(ws, room);
          break;
        }

        if (room.startsWith("job:")) {
          const jobId = Number(room.slice(4));
          if (isNaN(jobId)) return;

          // ── Job room access control ──────────────────────────────────────
          // Fetch the job to check ownership / assignment
          const [job] = await db
            .select({ technician_id: jobs.technician_id, request_id: jobs.request_id })
            .from(jobs)
            .where(eq(jobs.id, jobId))
            .limit(1);

          if (!job) return; // job not found — silently ignore

          if (ws.userRole === "customer") {
            // Customer: must own the service request linked to this job
            const [req_] = await db
              .select({ customer_id: serviceRequests.customer_id })
              .from(serviceRequests)
              .where(eq(serviceRequests.id, job.request_id))
              .limit(1);
            if (!req_ || req_.customer_id !== ws.userId) {
              this.send(ws, { type: "error", error: "Not authorized for this job" });
              return;
            }
          } else if (ws.userRole === "technician") {
            // Technician: may join if job is unassigned (pending) OR assigned to them
            if (job.technician_id !== null && job.technician_id !== ws.userId) {
              this.send(ws, { type: "error", error: "Not authorized for this job" });
              return;
            }
          } else {
            return; // unknown role
          }

          this.joinRoom(ws, room);

        } else if (room === "technicians" && ws.userRole === "technician") {
          this.joinRoom(ws, room);
        }
        break;
      }

      case "leave": {
        const room = typeof msg.room === "string" ? msg.room : "";
        this.leaveRoom(ws, room);
        break;
      }

      case "location_update": {
        if (ws.userRole !== "technician" || !ws.userId) return;

        const lat   = Number(msg.lat);
        const lng   = Number(msg.lng);
        const jobId = Number(msg.jobId);
        if (isNaN(lat) || isNaN(lng) || isNaN(jobId)) return;

        // Authorization: verify this technician is the assigned owner of the job
        const assigned = await db
          .select({ id: jobs.id })
          .from(jobs)
          .where(and(eq(jobs.id, jobId), eq(jobs.technician_id, ws.userId)))
          .limit(1);

        if (!assigned.length) {
          // Not assigned — silently drop (no error sent to avoid leaking job state)
          return;
        }

        // Persist last-known position for the admin live map
        setTechLocation(ws.userId, lat, lng);

        const seenAt = new Date().toISOString();

        // Relay to the job room (keyed by job ID) so the customer's tracking screen updates
        this.broadcastToRoom(`job:${jobId}`, { type: "tech_location", lat, lng, jobId });

        // Relay to the admin room so the dispatch map updates in real-time
        this.broadcastToRoom("admin", {
          type: "tech_location_admin",
          technicianId: ws.userId,
          lat,
          lng,
          seenAt,
        });
        break;
      }

      default:
        // Unknown message type — silently ignore
    }
  }

  private joinRoom(ws: AuthedSocket, room: string): void {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(ws);
    ws.rooms.add(room);
  }

  private leaveRoom(ws: AuthedSocket, room: string): void {
    this.rooms.get(room)?.delete(ws);
    ws.rooms.delete(room);
  }

  private cleanup(ws: AuthedSocket): void {
    for (const room of ws.rooms) {
      this.rooms.get(room)?.delete(ws);
    }
    ws.rooms.clear();
  }

  // ── Public broadcast API ────────────────────────────────────────────────────

  /** Send a message to every socket in the given room. */
  broadcastToRoom(room: string, message: DispatchMessage): void {
    const sockets = this.rooms.get(room);
    if (!sockets?.size) return;
    const payload = JSON.stringify(message);
    let sent = 0;
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sent++;
      }
    }
    if (sent) logger.debug({ room, type: message.type, sent }, "dispatch broadcast");
  }

  /** Number of clients currently connected. */
  get connectionCount(): number {
    return this.wss?.clients.size ?? 0;
  }
}

export const dispatch = new DispatchServer();
