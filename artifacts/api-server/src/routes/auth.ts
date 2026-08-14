import { Router, type IRouter } from "express";
import { generateToken, hashToken, tokenExpiresAt } from "../lib/tokenAuth";
import { db, users, userSessions, vehicles } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { toVehicleDto } from "../lib/vehicleDto";

/** Normalise a Saudi phone number to E.164 (+966XXXXXXXXX). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+966${digits.slice(3)}`;
  if (digits.startsWith("0"))   return `+966${digits.slice(1)}`;
  return `+966${digits}`;
}

const router: IRouter = Router();

// Server-side invite code gate for new technician accounts.
// Fail-closed: if TECHNICIAN_INVITE_CODE is not set, technician signup is disabled.
// Existing users' roles are NEVER changed via the login flow.
const TECH_INVITE_CODE: string | undefined = process.env.TECHNICIAN_INVITE_CODE;

// ── Shared phone-login handler ────────────────────────────────────────────────
// Role policy:
//   - Existing user → role is NEVER changed; invite_code ignored.
//   - New user + valid invite_code → role = 'technician'.
//   - New user, no/invalid code   → role = 'customer'.
async function phoneLogin(
  req: import("express").Request,
  res: import("express").Response,
) {
  try {
    const {
      phone, name, invite_code, device_name, platform,
    } = req.body as {
      phone?:       string;
      name?:        string;
      invite_code?: string;
      device_name?: string;
      platform?:    string;
    };

    if (!phone || phone.replace(/\D/g, "").length < 9) {
      res.status(400).json({ error: "Invalid phone number" });
      return;
    }

    const canonicalPhone = normalizePhone(phone);

    // Upsert user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, canonicalPhone))
      .limit(1);

    const isValidCode =
      TECH_INVITE_CODE !== undefined &&
      TECH_INVITE_CODE.length > 0 &&
      typeof invite_code === "string" &&
      invite_code.trim() === TECH_INVITE_CODE;

    let user;
    if (existing.length) {
      const updates: Partial<typeof users.$inferInsert> = { updated_at: new Date() };
      if (name) updates.name = name;
      // Upgrade customer → technician if a valid invite code is now supplied
      if (isValidCode && existing[0].role === "customer") {
        updates.role = "technician";
      }
      [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.phone, canonicalPhone))
        .returning();
    } else {
      const role: "customer" | "technician" = isValidCode ? "technician" : "customer";
      [user] = await db
        .insert(users)
        .values({ phone: canonicalPhone, name: name ?? null, role })
        .returning();
    }

    // Create a new session — store only the hash, return the raw token once
    const rawToken  = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = tokenExpiresAt();
    const ipAddress = req.ip ?? req.socket.remoteAddress ?? null;

    const [, userVehicles] = await Promise.all([
      db.insert(userSessions).values({
        user_id:     user.id,
        token_hash:  tokenHash,
        device_name: device_name ?? null,
        platform:    platform    ?? null,
        ip_address:  ipAddress,
        expires_at:  expiresAt,
      }),
      db.select().from(vehicles).where(eq(vehicles.user_id, user.id)),
    ]);

    res.json({
      ok: true,
      token: rawToken,
      user: {
        id:            String(user.id),
        phone:         user.phone,
        name:          user.name ?? "Guest",
        role:          user.role,
        membership:    user.membership,
        points:        user.points,
        rating:        user.rating,
        jobsCompleted: user.jobs_completed,
        vehicles:      userVehicles.map(toVehicleDto),
        // False when the user has never set a name (brand-new signups) —
        // the customer app routes them to the profile-setup screen.
        profile_complete: user.name != null && user.name.trim() !== "",
      },
    });
  } catch (err) {
    console.error("[auth] login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Primary phone-login endpoint (no OTP required).
// Body: { phone, name?, invite_code?, device_name?, platform? }
// Returns: { ok, token, user }
router.post("/auth/login", phoneLogin);

// ── POST /api/auth/send-otp  (legacy alias) ───────────────────────────────────
// Kept for backward-compat with old app builds. Just validates the phone and
// returns ok so the caller can proceed to verify-otp.
router.post("/auth/send-otp", async (req, res) => {
  const { phone, invite_code } = req.body as { phone?: string; invite_code?: string };
  if (!phone || phone.replace(/\D/g, "").length < 9) {
    res.status(400).json({ error: "Invalid phone number" });
    return;
  }
  if (invite_code !== undefined && invite_code !== "") {
    const isValidCode =
      TECH_INVITE_CODE !== undefined &&
      TECH_INVITE_CODE.length > 0 &&
      typeof invite_code === "string" &&
      invite_code.trim() === TECH_INVITE_CODE;
    if (!isValidCode) {
      res.status(400).json({ error: "Invalid invite code. Please check it and try again.", field: "invite_code" });
      return;
    }
  }
  res.json({ ok: true, phone });
});

// ── POST /api/auth/verify-otp  (legacy alias) ────────────────────────────────
// Kept for backward-compat with old app builds. `otp` field is accepted but
// ignored — login proceeds on phone alone.
// Body: { phone, otp?, name?, invite_code?, device_name?, platform? }
router.post("/auth/verify-otp", phoneLogin);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// Revokes only the calling session (sets revoked_at). Other devices unaffected.
router.post("/auth/logout", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const tokenHash = hashToken(auth.slice(7));
  try {
    await db
      .update(userSessions)
      .set({ revoked_at: new Date() })
      .where(and(eq(userSessions.token_hash, tokenHash), isNull(userSessions.revoked_at)));
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/auth/sessions ────────────────────────────────────────────────────
// Returns all active (non-revoked, non-expired) sessions for the caller.
router.get("/auth/sessions", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const tokenHash = hashToken(auth.slice(7));
  try {
    const now = new Date();
    // Resolve the session to get user_id
    const [session] = await db
      .select({ user_id: userSessions.user_id })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.token_hash, tokenHash),
          gt(userSessions.expires_at, now),
          isNull(userSessions.revoked_at),
        ),
      )
      .limit(1);

    if (!session) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const sessions = await db
      .select({
        id:           userSessions.id,
        device_name:  userSessions.device_name,
        platform:     userSessions.platform,
        ip_address:   userSessions.ip_address,
        created_at:   userSessions.created_at,
        last_used_at: userSessions.last_used_at,
        expires_at:   userSessions.expires_at,
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.user_id, session.user_id),
          gt(userSessions.expires_at, now),
          isNull(userSessions.revoked_at),
        ),
      );

    res.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── DELETE /api/auth/sessions/:id ─────────────────────────────────────────────
// Remotely revoke any of the caller's own sessions by ID.
router.delete("/auth/sessions/:id", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const tokenHash = hashToken(auth.slice(7));
  const targetId  = Number(req.params.id);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }
  try {
    const now = new Date();
    // Resolve caller's user_id
    const [caller] = await db
      .select({ user_id: userSessions.user_id })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.token_hash, tokenHash),
          gt(userSessions.expires_at, now),
          isNull(userSessions.revoked_at),
        ),
      )
      .limit(1);

    if (!caller) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Only allow revoking sessions that belong to the same user
    await db
      .update(userSessions)
      .set({ revoked_at: new Date() })
      .where(
        and(
          eq(userSessions.id, targetId),
          eq(userSessions.user_id, caller.user_id),
          isNull(userSessions.revoked_at),
        ),
      );

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
