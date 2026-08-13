import { Router, type IRouter } from "express";
import { db, serviceRequests, jobs, users, promoUses } from "@workspace/db";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { dispatch } from "../lib/dispatch";
import { notifyTechniciansNewJob } from "../lib/pushNotifications";
import { moyasarFetch } from "../lib/moyasarClient";
import { lookupPromo, applyPromo } from "./moyasar";

const router: IRouter = Router();

/** Services covered (free) under each subscription plan — mirrors the app. */
const PLAN_COVERED: Record<string, string[]> = {
  basic:     ["battery", "fuel", "tire", "tow", "mechanic", "electric"],
  accidents: ["battery", "fuel", "tire", "tow", "mechanic", "electric"],
  rental:    ["battery", "fuel", "tire", "tow", "mechanic", "electric"],
  premium:   ["battery", "fuel", "tire", "tow", "mechanic", "electric", "lockout"],
};

// POST /api/requests  — create a new service request
router.post("/requests", requireAuth, async (req, res) => {
  try {
    const {
      service_type, vehicle_make, vehicle_model, vehicle_year,
      vehicle_plate, vehicle_color, location_lat, location_lng, address, notes, photo_urls,
      payment_id, cash_intent, promo_code,
    } = req.body as {
      service_type: string;
      vehicle_make?: string; vehicle_model?: string; vehicle_year?: string;
      vehicle_plate?: string; vehicle_color?: string;
      location_lat?: number; location_lng?: number;
      address?: string; notes?: string; photo_urls?: string;
      payment_id?: string;
      cash_intent?: boolean;
      promo_code?: string;
    };

    if (!service_type) {
      res.status(400).json({ error: "service_type is required" });
      return;
    }

    const PAYOUTS: Record<string, number> = {
      battery: 120, fuel: 80, tire: 350, tow: 500, lockout: 200,
      mechanic: 300, electric: 280,
    };

    // ── Payment validation for non-members ────────────────────────────────────
    const [userRow] = await db
      .select({ membership: users.membership })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    const membership = userRow?.membership ?? "none";
    const coveredServices = PLAN_COVERED[membership] ?? [];
    const isCovered = membership !== "none" && coveredServices.includes(service_type);

    let resolvedPaymentMethod: string;
    // For card payments: promo is sourced exclusively from verified Moyasar metadata.
    // For cash payments: promo comes from the client body (honour-system; tech collects discounted amount).
    let verifiedMetaPromoCode: string | undefined;
    // Canonical amount actually charged / due, in halalas. Set during payment verification.
    let cardAmountHalalas: number | undefined;

    if (isCovered) {
      // Member — no payment needed
      resolvedPaymentMethod = "covered";
    } else if (cash_intent === true) {
      // Cash on delivery — accepted; promo is informational (technician collects discounted amount)
      resolvedPaymentMethod = "cash";
    } else if (payment_id) {
      // Verify the Moyasar payment is actually paid, bound to this user, and covers this service
      try {
        const payment = (await moyasarFetch("GET", `/payments/${payment_id}`)) as {
          status: string;
          amount: number;
          metadata?: { type?: string; service_type?: string; user_id?: string; promo_code?: string };
        };

        if (payment.status !== "paid") {
          res.status(402).json({
            error: `Payment not completed (status: ${payment.status}). Please retry.`,
          });
          return;
        }

        // MANDATORY: payment must be a service payment (not a subscription or other flow)
        if (payment.metadata?.type !== "service") {
          res.status(403).json({ error: "Invalid payment type for service requests." });
          return;
        }

        // MANDATORY: payment must be bound to this authenticated user
        if (!payment.metadata.user_id || payment.metadata.user_id !== String(req.userId)) {
          res.status(403).json({ error: "Payment does not belong to this account." });
          return;
        }

        // MANDATORY: payment must be for exactly this service type
        if (!payment.metadata.service_type || payment.metadata.service_type !== service_type) {
          res.status(402).json({
            error: `Payment was for '${payment.metadata.service_type ?? "unknown"}', not '${service_type}'.`,
          });
          return;
        }

        // Amount sanity-check: payment must cover the (possibly promo-discounted) service cost.
        // Promo is derived exclusively from server-issued metadata — client-body promo_code is
        // intentionally ignored for card payments to prevent tampered discount requests.
        const baseHalalas = (PAYOUTS[service_type] ?? 0) * 100;
        let expectedHalalas = baseHalalas;
        if (payment.metadata?.promo_code) {
          const promo = lookupPromo(payment.metadata.promo_code);
          if (promo) {
            expectedHalalas = applyPromo(baseHalalas, promo);
            verifiedMetaPromoCode = promo.code; // authoritative — came from Moyasar metadata
          }
          // Unknown/expired metadata code → fall back to full price (prevents forged codes)
        }
        if (payment.amount < expectedHalalas) {
          res.status(402).json({ error: "Payment amount is less than the service cost." });
          return;
        }
        cardAmountHalalas = payment.amount; // authoritative — verified from Moyasar
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Payment verification failed";
        res.status(402).json({ error: `Could not verify payment: ${msg}` });
        return;
      }
      resolvedPaymentMethod = "card";
    } else {
      // Non-member with no payment — reject
      res.status(402).json({
        error: "Payment required. Please complete payment before requesting service.",
      });
      return;
    }

    // Resolve authoritative promo code:
    //   card  → only from verified Moyasar metadata (set above); client body is ignored
    //   cash  → from client body (validated here server-side)
    //   covered → no promo
    const authoritativePromoRaw =
      resolvedPaymentMethod === "card" ? verifiedMetaPromoCode :
      resolvedPaymentMethod === "cash" ? promo_code : undefined;

    const baseHalalas = (PAYOUTS[service_type] ?? 0) * 100;

    let resolvedPromoCode: string | null = null;
    let resolvedDiscountHalalas: number = 0;  // halalas — avoids SAR fraction rounding
    if (authoritativePromoRaw) {
      const promo = lookupPromo(authoritativePromoRaw);
      if (promo) {
        // Cash promo: atomically claim before the service request is created.
        // Card promo: already claimed in /payment/service-checkout — skip to avoid double-insert.
        if (resolvedPaymentMethod === "cash") {
          const claimed = await db
            .insert(promoUses)
            .values({ user_id: req.userId!, code: promo.code })
            .onConflictDoNothing({ target: [promoUses.user_id, promoUses.code] })
            .returning({ id: promoUses.id });

          if (claimed.length === 0) {
            res.status(400).json({ error: "Code already used" });
            return;
          }
        }

        const discountedHalalas = applyPromo(baseHalalas, promo);
        resolvedPromoCode = promo.code;
        resolvedDiscountHalalas = baseHalalas - discountedHalalas; // precise, no fraction
      }
      // Unknown/expired code: silently ignore — don't block the request
    }

    // Canonical customer-payable amount:
    //   card    → authoritative amount verified from Moyasar (halalas)
    //   cash    → base minus promo discount (halalas)
    //   covered → 0 (free)
    let finalAmountHalalas: number;
    if (resolvedPaymentMethod === "card" && cardAmountHalalas !== undefined) {
      finalAmountHalalas = cardAmountHalalas;
    } else if (resolvedPaymentMethod === "cash") {
      finalAmountHalalas = baseHalalas - resolvedDiscountHalalas;
    } else {
      finalAmountHalalas = 0; // covered (membership)
    }

    // Create the service request (payment_id has a UNIQUE constraint — prevents replay attacks)
    let req_: (typeof serviceRequests.$inferSelect);
    try {
      const rows = await db
        .insert(serviceRequests)
        .values({
          customer_id:          req.userId!,
          service_type:         service_type as any,
          vehicle_make, vehicle_model, vehicle_year,
          vehicle_plate, vehicle_color,
          location_lat, location_lng, address, notes,
          photo_urls,
          payment_id:           payment_id ?? null,
          payment_method:       resolvedPaymentMethod,
          promo_code:           resolvedPromoCode,
          discount_amount:      resolvedDiscountHalalas || null,  // halalas
          final_amount_halalas: finalAmountHalalas,
        } as any)
        .returning();
      req_ = rows[0];
    } catch (err: unknown) {
      // Unique constraint violation — payment_id already used for another request
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        res.status(409).json({ error: "This payment has already been used for another request." });
        return;
      }
      throw err; // re-throw unexpected errors
    }

    // Create a corresponding job (unassigned) so technicians can see it
    const [job] = await db
      .insert(jobs)
      .values({
        request_id: req_.id,
        payout:     PAYOUTS[service_type] ?? 150,
        // Distance/ETA will be filled in by dispatch or technician side
      })
      .returning();

    // Fetch the customer's name + phone for the dispatch broadcast
    const [customer] = await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    // Broadcast to all online technicians so the job appears instantly in their queue
    dispatch.broadcastToRoom("technicians", {
      type: "new_job",
      job: {
        id:           job.id,
        request_id:   req_.id,
        payout:       job.payout,
        status:       "pending",
        service_type: service_type,
        address:      address        ?? null,
        location_lat: location_lat  ?? null,
        location_lng: location_lng  ?? null,
        vehicle_make:  vehicle_make  ?? null,
        vehicle_model: vehicle_model ?? null,
        vehicle_year:  vehicle_year  ?? null,
        vehicle_plate: vehicle_plate ?? null,
        vehicle_color: vehicle_color ?? null,
        notes:        notes         ?? null,
        photo_urls:   photo_urls    ?? null,
        created_at:   job.created_at,
        request:      req_,
        customer: {
          name:  customer?.name  ?? "Customer",
          phone: customer?.phone ?? "",
        },
      },
    });

    // Push notification to technicians who aren't connected via WebSocket
    void notifyTechniciansNewJob({
      serviceType: service_type,
      address:     address ?? null,
      payout:      job.payout,
      jobId:       job.id,
    });

    res.status(201).json({ request: req_, job });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/requests  — list requests for the current customer
router.get("/requests", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.customer_id, req.userId!))
      .orderBy(desc(serviceRequests.created_at));

    // Attach job/technician info for each request
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const jobRows = await db
          .select({
            id: jobs.id, status: jobs.status, payout: jobs.payout,
            distance_km: jobs.distance_km, eta_min: jobs.eta_min,
            technician_id: jobs.technician_id,
            accepted_at: jobs.accepted_at, completed_at: jobs.completed_at,
          })
          .from(jobs)
          .where(eq(jobs.request_id, r.id))
          .orderBy(desc(jobs.created_at))
          .limit(1);

        let techName: string | null = null;
        if (jobRows[0]?.technician_id) {
          const techRows = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, jobRows[0].technician_id))
            .limit(1);
          techName = techRows[0]?.name ?? null;
        }

        return { ...r, job: jobRows[0] ?? null, techName };
      }),
    );

    res.json({ requests: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/requests/:id
// Returns the service request plus its most-recent job (status, eta, payout)
// and technician info (name, phone, rating) so the client can catch up after
// being offline without waiting for a WebSocket event.
router.get("/requests/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const rows = await db
      .select()
      .from(serviceRequests)
      .where(and(eq(serviceRequests.id, id), eq(serviceRequests.customer_id, req.userId!)))
      .limit(1);

    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }

    const request = rows[0];

    // Fetch the most-recent job associated with this request
    const jobRows = await db
      .select({
        id:            jobs.id,
        status:        jobs.status,
        payout:        jobs.payout,
        distance_km:   jobs.distance_km,
        eta_min:       jobs.eta_min,
        technician_id: jobs.technician_id,
        accepted_at:   jobs.accepted_at,
        completed_at:  jobs.completed_at,
      })
      .from(jobs)
      .where(eq(jobs.request_id, id))
      .orderBy(desc(jobs.created_at))
      .limit(1);

    const job = jobRows[0] ?? null;

    // Fetch technician info if the job has been assigned
    let tech: { id: number; name: string; phone: string; rating: number } | null = null;
    if (job?.technician_id) {
      const techRows = await db
        .select({ id: users.id, name: users.name, phone: users.phone, rating: users.rating })
        .from(users)
        .where(eq(users.id, job.technician_id))
        .limit(1);
      if (techRows[0]) {
        tech = {
          id:     techRows[0].id,
          name:   techRows[0].name   ?? "Technician",
          phone:  techRows[0].phone  ?? "",
          rating: Number(techRows[0].rating ?? 4.5),
        };
      }
    }

    res.json({ ...request, job, tech });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PATCH /api/requests/:id  — update status (e.g. cancel)
router.patch("/requests/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status } = req.body as { status?: string };
    if (!status) { res.status(400).json({ error: "status is required" }); return; }

    const [updated] = await db
      .update(serviceRequests)
      .set({ status: status as any, updated_at: new Date() })
      .where(and(eq(serviceRequests.id, id), eq(serviceRequests.customer_id, req.userId!)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/payments — completed-service payment history for the current customer
router.get("/payments", requireAuth, async (req, res) => {
  try {
    // Single query: join the most-recent completed job to get the payout.
    // Only service_requests with status='completed' are returned so users
    // never see a receipt before the service is finished.
    const rows = await db
      .select({
        id:                   serviceRequests.id,
        service_type:         serviceRequests.service_type,
        created_at:           serviceRequests.created_at,
        payment_id:           serviceRequests.payment_id,
        payment_method:       serviceRequests.payment_method,
        address:              serviceRequests.address,
        promo_code:           serviceRequests.promo_code,
        final_amount_halalas: (serviceRequests as any).final_amount_halalas,
        payout:               jobs.payout,
      })
      .from(serviceRequests)
      .leftJoin(jobs, eq(jobs.request_id, serviceRequests.id))
      .where(
        and(
          eq(serviceRequests.customer_id, req.userId!),
          eq(serviceRequests.status, "completed"),
          isNotNull(serviceRequests.payment_method),
        ),
      )
      .orderBy(desc(serviceRequests.created_at));

    const PAYOUTS: Record<string, number> = {
      battery: 120, fuel: 80, tire: 350, tow: 500, lockout: 200, mechanic: 300, electric: 280,
    };

    // De-duplicate: a request may have multiple job rows after a left-join;
    // collapse to one entry per request, preferring the highest payout seen.
    const seen = new Map<number, (typeof rows)[0]>();
    for (const row of rows) {
      const existing = seen.get(row.id);
      if (!existing || (row.payout ?? 0) > (existing.payout ?? 0)) {
        seen.set(row.id, row);
      }
    }

    const payments = Array.from(seen.values()).map((r) => {
      // Prefer the authoritative final_amount_halalas (in SAR) stored at checkout time.
      // Fall back to the job payout, then the static price table — for older records.
      const finalHalalas: number | null | undefined = (r as any).final_amount_halalas;
      const amount = finalHalalas != null
        ? finalHalalas / 100
        : r.payout ?? PAYOUTS[r.service_type] ?? 0;

      return {
        id:             r.id,
        service_type:   r.service_type,
        created_at:     r.created_at,
        payment_id:     r.payment_id,
        payment_method: r.payment_method,
        address:        r.address,
        promo_code:     (r as any).promo_code ?? null,
        amount,
      };
    });

    // Maintain descending chronological order after Map de-dup
    payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ payments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
