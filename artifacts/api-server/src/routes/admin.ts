import { Router, type IRouter } from "express";
import fs from "fs";
import multer from "multer";
import { db, users, serviceRequests, jobs } from "@workspace/db";
import { eq, and, desc, sql, gte, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAdmin } from "../middlewares/requireAdmin";
import { createAdminSession } from "../lib/adminSessions";
import { techLocations } from "../lib/techLocations";
import { dispatch } from "../lib/dispatch";
import { notifyCustomerJobAccepted } from "../lib/pushNotifications";
import {
  getSiteSettings,
  updateBanners,
  updateTheme,
  setHeroImageUpdatedAt,
  HERO_IMAGE_PATH,
  getAppConfig,
  updateAppTheme,
  updateAppOffers,
  updateAppAnnouncement,
  updateAppServiceConfig,
  updateAppContact,
  type BannerSettings,
  type ThemeSettings,
  type AppThemeSettings,
  type AppOffer,
  type AppAnnouncement,
  type AppServiceConfig,
  type AppContactConfig,
} from "../lib/siteSettings";

// Multer: store upload in memory, validate type/size
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed"));
    }
  },
});

const router: IRouter = Router();

// ── POST /api/admin/login ─────────────────────────────────────────────────────

router.post("/admin/login", async (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.status(503).json({ error: "Admin login is not configured" });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const session = await createAdminSession();
  res.json({ token: session.token, expiresAt: session.expiresAt.toISOString() });
});

// ── GET /api/admin/requests ───────────────────────────────────────────────────

const techniciansAlias = alias(users, "technician");

router.get("/admin/requests", requireAdmin, async (req, res) => {
  try {
    const { status: statusFilter, service_type: typeFilter } = req.query as {
      status?: string;
      service_type?: string;
    };

    // Build base query: requests + customer + job + technician (via alias)
    const rows = await db
      .select({
        // Service request
        req_id:           serviceRequests.id,
        req_status:       serviceRequests.status,
        req_service_type: serviceRequests.service_type,
        req_address:      serviceRequests.address,
        req_lat:          serviceRequests.location_lat,
        req_lng:          serviceRequests.location_lng,
        req_vehicle_make:  serviceRequests.vehicle_make,
        req_vehicle_model: serviceRequests.vehicle_model,
        req_vehicle_plate: serviceRequests.vehicle_plate,
        req_notes:        serviceRequests.notes,
        req_created_at:   serviceRequests.created_at,
        req_updated_at:   serviceRequests.updated_at,
        // Customer
        cust_id:    users.id,
        cust_name:  users.name,
        cust_phone: users.phone,
        // Job
        job_id:           jobs.id,
        job_status:       jobs.status,
        job_payout:       jobs.payout,
        job_tech_id:      jobs.technician_id,
        job_accepted_at:  jobs.accepted_at,
        job_completed_at: jobs.completed_at,
        job_created_at:   jobs.created_at,
        // Technician (via alias)
        tech_name:  techniciansAlias.name,
        tech_phone: techniciansAlias.phone,
      })
      .from(serviceRequests)
      .innerJoin(users, eq(users.id, serviceRequests.customer_id))
      .leftJoin(jobs, eq(jobs.request_id, serviceRequests.id))
      .leftJoin(techniciansAlias, eq(techniciansAlias.id, jobs.technician_id))
      .orderBy(desc(serviceRequests.created_at));

    // Apply optional filters in-process (small dataset; avoids per-filter query variants)
    const filtered = rows.filter((r) => {
      if (statusFilter && r.req_status !== statusFilter) return false;
      if (typeFilter && r.req_service_type !== typeFilter) return false;
      return true;
    });

    const requests = filtered.map((r) => ({
      id:            r.req_id,
      status:        r.req_status,
      service_type:  r.req_service_type,
      address:       r.req_address,
      location_lat:  r.req_lat,
      location_lng:  r.req_lng,
      vehicle_make:  r.req_vehicle_make,
      vehicle_model: r.req_vehicle_model,
      vehicle_plate: r.req_vehicle_plate,
      notes:         r.req_notes,
      created_at:    r.req_created_at.toISOString(),
      updated_at:    r.req_updated_at.toISOString(),
      customer: {
        id:    r.cust_id,
        name:  r.cust_name,
        phone: r.cust_phone,
      },
      job: {
        id:               r.job_id,
        status:           r.job_status,
        payout:           r.job_payout,
        technician_id:    r.job_tech_id,
        technician_name:  r.tech_name,
        technician_phone: r.tech_phone,
        accepted_at:      r.job_accepted_at?.toISOString() ?? null,
        completed_at:     r.job_completed_at?.toISOString() ?? null,
        created_at:       r.job_created_at?.toISOString() ?? null,
      },
    }));

    res.json({ requests });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── PATCH /api/admin/requests/:id/reassign ────────────────────────────────────

router.patch("/admin/requests/:id/reassign", requireAdmin, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { technician_id } = req.body as { technician_id?: number };

    if (isNaN(requestId) || !technician_id) {
      res.status(400).json({ error: "request id and technician_id are required" });
      return;
    }

    // Verify technician exists and is a technician
    const [tech] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, technician_id), eq(users.role, "technician")))
      .limit(1);

    if (!tech) {
      res.status(404).json({ error: "Technician not found" });
      return;
    }

    // Find the active job for this request
    const [job] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.request_id, requestId))
      .limit(1);

    if (!job) {
      res.status(404).json({ error: "No job found for this request" });
      return;
    }

    // Reassign the job
    await db
      .update(jobs)
      .set({ technician_id, status: "accepted", accepted_at: new Date(), updated_at: new Date() })
      .where(eq(jobs.id, job.id));

    // Update the service request status to assigned
    await db
      .update(serviceRequests)
      .set({ status: "assigned", updated_at: new Date() })
      .where(eq(serviceRequests.id, requestId));

    // Return the updated request
    const [updated] = await db
      .select({
        req_id:           serviceRequests.id,
        req_status:       serviceRequests.status,
        req_service_type: serviceRequests.service_type,
        req_address:      serviceRequests.address,
        req_lat:          serviceRequests.location_lat,
        req_lng:          serviceRequests.location_lng,
        req_vehicle_make:  serviceRequests.vehicle_make,
        req_vehicle_model: serviceRequests.vehicle_model,
        req_vehicle_plate: serviceRequests.vehicle_plate,
        req_notes:        serviceRequests.notes,
        req_created_at:   serviceRequests.created_at,
        req_updated_at:   serviceRequests.updated_at,
        cust_id:    users.id,
        cust_name:  users.name,
        cust_phone: users.phone,
        job_id:           jobs.id,
        job_status:       jobs.status,
        job_payout:       jobs.payout,
        job_tech_id:      jobs.technician_id,
        job_accepted_at:  jobs.accepted_at,
        job_completed_at: jobs.completed_at,
        job_created_at:   jobs.created_at,
        tech_name:  techniciansAlias.name,
        tech_phone:  techniciansAlias.phone,
        tech_rating: techniciansAlias.rating,
      })
      .from(serviceRequests)
      .innerJoin(users, eq(users.id, serviceRequests.customer_id))
      .leftJoin(jobs, eq(jobs.request_id, serviceRequests.id))
      .leftJoin(techniciansAlias, eq(techniciansAlias.id, jobs.technician_id))
      .where(eq(serviceRequests.id, requestId))
      .limit(1);

    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    // Notify customer app in real-time via WebSocket + push notification
    if (updated.job_id) {
      dispatch.broadcastToRoom(`job:${updated.job_id}`, {
        type:       "job_accepted",
        jobId:      updated.job_id,
        requestId:  updated.req_id,
        status:     "accepted",
        techId:     updated.job_tech_id,
        techName:   updated.tech_name   ?? "Technician",
        techPhone:  updated.tech_phone  ?? "",
        techRating: updated.tech_rating ?? 4.5,
      });
      dispatch.broadcastToRoom("technicians", { type: "job_taken", jobId: updated.job_id });
      void notifyCustomerJobAccepted({
        customerId:  updated.cust_id,
        techName:    updated.tech_name   ?? "Technician",
        serviceType: updated.req_service_type,
        jobId:       updated.job_id,
        requestId:   updated.req_id,
      });
    }

    res.json({
      id:            updated.req_id,
      status:        updated.req_status,
      service_type:  updated.req_service_type,
      address:       updated.req_address,
      location_lat:  updated.req_lat,
      location_lng:  updated.req_lng,
      vehicle_make:  updated.req_vehicle_make,
      vehicle_model: updated.req_vehicle_model,
      vehicle_plate: updated.req_vehicle_plate,
      notes:         updated.req_notes,
      created_at:    updated.req_created_at.toISOString(),
      updated_at:    updated.req_updated_at.toISOString(),
      customer: { id: updated.cust_id, name: updated.cust_name, phone: updated.cust_phone },
      job: {
        id:               updated.job_id,
        status:           updated.job_status,
        payout:           updated.job_payout,
        technician_id:    updated.job_tech_id,
        technician_name:  updated.tech_name,
        technician_phone: updated.tech_phone,
        accepted_at:      updated.job_accepted_at?.toISOString() ?? null,
        completed_at:     updated.job_completed_at?.toISOString() ?? null,
        created_at:       updated.job_created_at?.toISOString() ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── PATCH /api/admin/requests/:id/cancel ──────────────────────────────────────

router.patch("/admin/requests/:id/cancel", requireAdmin, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    if (isNaN(requestId)) {
      res.status(400).json({ error: "Invalid request id" });
      return;
    }

    // Cancel the job (if any)
    await db
      .update(jobs)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(and(eq(jobs.request_id, requestId)));

    // Cancel the service request
    const [updated] = await db
      .update(serviceRequests)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(serviceRequests.id, requestId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    // Return minimal shape (re-fetch for full joins)
    const [full] = await db
      .select({
        req_id:           serviceRequests.id,
        req_status:       serviceRequests.status,
        req_service_type: serviceRequests.service_type,
        req_address:      serviceRequests.address,
        req_lat:          serviceRequests.location_lat,
        req_lng:          serviceRequests.location_lng,
        req_vehicle_make:  serviceRequests.vehicle_make,
        req_vehicle_model: serviceRequests.vehicle_model,
        req_vehicle_plate: serviceRequests.vehicle_plate,
        req_notes:        serviceRequests.notes,
        req_created_at:   serviceRequests.created_at,
        req_updated_at:   serviceRequests.updated_at,
        cust_id:    users.id,
        cust_name:  users.name,
        cust_phone: users.phone,
        job_id:           jobs.id,
        job_status:       jobs.status,
        job_payout:       jobs.payout,
        job_tech_id:      jobs.technician_id,
        job_accepted_at:  jobs.accepted_at,
        job_completed_at: jobs.completed_at,
        job_created_at:   jobs.created_at,
        tech_name:  techniciansAlias.name,
        tech_phone: techniciansAlias.phone,
      })
      .from(serviceRequests)
      .innerJoin(users, eq(users.id, serviceRequests.customer_id))
      .leftJoin(jobs, eq(jobs.request_id, serviceRequests.id))
      .leftJoin(techniciansAlias, eq(techniciansAlias.id, jobs.technician_id))
      .where(eq(serviceRequests.id, requestId))
      .limit(1);

    if (!full) {
      res.status(404).json({ error: "Request not found after cancel" });
      return;
    }

    res.json({
      id:            full.req_id,
      status:        full.req_status,
      service_type:  full.req_service_type,
      address:       full.req_address,
      location_lat:  full.req_lat,
      location_lng:  full.req_lng,
      vehicle_make:  full.req_vehicle_make,
      vehicle_model: full.req_vehicle_model,
      vehicle_plate: full.req_vehicle_plate,
      notes:         full.req_notes,
      created_at:    full.req_created_at.toISOString(),
      updated_at:    full.req_updated_at.toISOString(),
      customer: { id: full.cust_id, name: full.cust_name, phone: full.cust_phone },
      job: {
        id:               full.job_id,
        status:           full.job_status,
        payout:           full.job_payout,
        technician_id:    full.job_tech_id,
        technician_name:  full.tech_name,
        technician_phone: full.tech_phone,
        accepted_at:      full.job_accepted_at?.toISOString() ?? null,
        completed_at:     full.job_completed_at?.toISOString() ?? null,
        created_at:       full.job_created_at?.toISOString() ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/admin/technicians ────────────────────────────────────────────────

router.get("/admin/technicians", requireAdmin, async (req, res) => {
  try {
    // All technician users
    const techRows = await db
      .select({
        id:              users.id,
        name:            users.name,
        phone:           users.phone,
        rating:          users.rating,
        jobs_completed:  users.jobs_completed,
        earnings_total:  users.earnings_total,
      })
      .from(users)
      .where(eq(users.role, "technician"));

    // Count active jobs per technician
    const activeJobRows = await db
      .select({
        technician_id: jobs.technician_id,
        active_count:  count(jobs.id),
      })
      .from(jobs)
      .where(
        sql`${jobs.status} IN ('accepted', 'en_route', 'arrived', 'working') AND ${jobs.technician_id} IS NOT NULL`,
      )
      .groupBy(jobs.technician_id);

    const activeMap = new Map<number, number>(
      activeJobRows
        .filter((r) => r.technician_id !== null)
        .map((r) => [r.technician_id as number, Number(r.active_count)]),
    );

    const technicians = techRows.map((t) => {
      const loc = techLocations.get(t.id);
      return {
        id:              t.id,
        name:            t.name,
        phone:           t.phone,
        rating:          t.rating,
        jobs_completed:  t.jobs_completed,
        earnings_total:  t.earnings_total,
        active_jobs:     activeMap.get(t.id) ?? 0,
        last_lat:        loc?.lat ?? null,
        last_lng:        loc?.lng ?? null,
        last_seen_at:    loc?.seenAt.toISOString() ?? null,
      };
    });

    res.json({ technicians });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Requests today
    const [todayCount] = await db
      .select({ c: count(serviceRequests.id) })
      .from(serviceRequests)
      .where(gte(serviceRequests.created_at, todayStart));

    // Requests total
    const [totalCount] = await db
      .select({ c: count(serviceRequests.id) })
      .from(serviceRequests);

    // Completed today
    const [completedToday] = await db
      .select({ c: count(jobs.id) })
      .from(jobs)
      .where(and(
        eq(jobs.status, "completed"),
        gte(jobs.completed_at, todayStart),
      ));

    // Active jobs
    const [activeCount] = await db
      .select({ c: count(jobs.id) })
      .from(jobs)
      .where(sql`${jobs.status} IN ('accepted', 'en_route', 'arrived', 'working')`);

    // Average response time (seconds from request created_at → job accepted_at)
    const [avgResp] = await db
      .select({
        avg_seconds: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${jobs.accepted_at} - ${serviceRequests.created_at})))`,
      })
      .from(jobs)
      .innerJoin(serviceRequests, eq(serviceRequests.id, jobs.request_id))
      .where(sql`${jobs.accepted_at} IS NOT NULL`);

    // Revenue today (sum of completed job payouts)
    const [revToday] = await db
      .select({ total: sql<number>`COALESCE(SUM(${jobs.payout}), 0)` })
      .from(jobs)
      .where(and(
        eq(jobs.status, "completed"),
        gte(jobs.completed_at, todayStart),
      ));

    // Revenue total
    const [revTotal] = await db
      .select({ total: sql<number>`COALESCE(SUM(${jobs.payout}), 0)` })
      .from(jobs)
      .where(eq(jobs.status, "completed"));

    // Requests by service type
    const byType = await db
      .select({
        service_type: serviceRequests.service_type,
        c: count(serviceRequests.id),
      })
      .from(serviceRequests)
      .groupBy(serviceRequests.service_type);

    // Requests by status
    const byStatus = await db
      .select({
        status: serviceRequests.status,
        c: count(serviceRequests.id),
      })
      .from(serviceRequests)
      .groupBy(serviceRequests.status);

    res.json({
      requests_today:        Number(todayCount?.c ?? 0),
      requests_total:        Number(totalCount?.c ?? 0),
      active_jobs:           Number(activeCount?.c ?? 0),
      completed_today:       Number(completedToday?.c ?? 0),
      avg_response_seconds:  avgResp?.avg_seconds ?? null,
      revenue_today:         Number(revToday?.total ?? 0),
      revenue_total:         Number(revTotal?.total ?? 0),
      by_service_type:       byType.map((r) => ({ service_type: r.service_type, count: Number(r.c) })),
      by_status:             byStatus.map((r) => ({ status: r.status, count: Number(r.c) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/admin/site-settings ─────────────────────────────────────────────

router.get("/admin/site-settings", requireAdmin, async (_req, res) => {
  res.json(await getSiteSettings());
});

// ── PUT /api/admin/site-settings/banners ─────────────────────────────────────

router.put("/admin/site-settings/banners", requireAdmin, async (req, res) => {
  const banners = req.body as BannerSettings;
  const updated = await updateBanners(banners);
  res.json(updated);
});

// ── PUT /api/admin/site-settings/theme ───────────────────────────────────────

router.put("/admin/site-settings/theme", requireAdmin, async (req, res) => {
  const theme = req.body as ThemeSettings;
  const updated = await updateTheme(theme);
  res.json(updated);
});

// ── POST /api/admin/site-settings/hero-image ─────────────────────────────────

router.post(
  "/admin/site-settings/hero-image",
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    // Ensure the data directory exists
    const dir = HERO_IMAGE_PATH.replace(/\/[^/]+$/, "");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Write the uploaded image to data/hero.jpg (always as JPEG name regardless of PNG)
    fs.writeFileSync(HERO_IMAGE_PATH, req.file.buffer);

    const updatedAt = new Date().toISOString();
    const settings  = await setHeroImageUpdatedAt(updatedAt);
    res.json({ heroImageUpdatedAt: settings.heroImageUpdatedAt });
  },
);

// ── GET /api/hero-image (public) ─────────────────────────────────────────────

router.get("/hero-image", (_req, res) => {
  if (!fs.existsSync(HERO_IMAGE_PATH)) {
    res.status(404).json({ error: "No custom hero image uploaded yet" });
    return;
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(HERO_IMAGE_PATH);
});

// ── GET /api/app-config (public) ─────────────────────────────────────────────
// Consumed by jai-app to load theme overrides + offers on launch.

router.get("/app-config", async (_req, res) => {
  res.json(await getAppConfig());
});

// ── PUT /api/admin/app-config/theme ──────────────────────────────────────────

router.put("/admin/app-config/theme", requireAdmin, async (req, res) => {
  const theme = req.body as AppThemeSettings;
  const updated = await updateAppTheme(theme);
  res.json(updated);
});

// ── PUT /api/admin/app-config/offers ─────────────────────────────────────────

router.put("/admin/app-config/offers", requireAdmin, async (req, res) => {
  const offers = req.body as AppOffer[];
  if (!Array.isArray(offers)) {
    res.status(400).json({ error: "offers must be an array" });
    return;
  }
  const updated = await updateAppOffers(offers);
  res.json(updated);
});

// ── PUT /api/admin/app-config/announcement ────────────────────────────────────

router.put("/admin/app-config/announcement", requireAdmin, async (req, res) => {
  const announcement = req.body as AppAnnouncement;
  const updated = await updateAppAnnouncement(announcement);
  res.json(updated);
});

// ── PUT /api/admin/app-config/services ────────────────────────────────────────

router.put("/admin/app-config/services", requireAdmin, async (req, res) => {
  const config = req.body as AppServiceConfig;
  const updated = await updateAppServiceConfig(config);
  res.json(updated);
});

// ── PUT /api/admin/app-config/contact ─────────────────────────────────────────

router.put("/admin/app-config/contact", requireAdmin, async (req, res) => {
  const contact = req.body as AppContactConfig;
  const updated = await updateAppContact(contact);
  res.json(updated);
});

// ── PUT /api/admin/app-config/plans ───────────────────────────────────────────

router.put("/admin/app-config/plans", requireAdmin, async (req, res) => {
  const { updateAppPlans } = await import("../lib/siteSettings");
  const plans = req.body;
  if (!Array.isArray(plans)) { res.status(400).json({ error: "plans must be an array" }); return; }
  const updated = await updateAppPlans(plans);
  res.json(updated);
});

// ── PATCH /api/admin/users/:id/membership ─────────────────────────────────────

router.patch("/admin/users/:id/membership", requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const { membership } = req.body as { membership: string };
  const valid = ["none", "basic", "accidents", "rental"];
  if (!valid.includes(membership)) {
    res.status(400).json({ error: `membership must be one of: ${valid.join(", ")}` });
    return;
  }
  try {
    const rows = await db
      .update(users)
      .set({ membership: membership as any, updated_at: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, phone: users.phone, name: users.name, membership: users.membership });
    if (!rows.length) { res.status(404).json({ error: "User not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/site-settings (public) ──────────────────────────────────────────
// Registered on the router but mounted at /api — consumed by jai-web

router.get("/site-settings", async (_req, res) => {
  res.json(await getSiteSettings());
});

export default router;
