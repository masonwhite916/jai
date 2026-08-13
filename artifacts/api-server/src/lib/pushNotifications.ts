/**
 * Server-side Expo push notification helper.
 *
 * Uses the Expo Push API directly over HTTP — no SDK required.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * All send functions are best-effort: they log failures but never throw,
 * so a push error never breaks the main request/response flow.
 */

import { db, users, jobs, serviceRequests, notifications } from "@workspace/db";
import { eq, isNotNull, ne } from "drizzle-orm";
import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

/** Shape of a ticket returned by the Expo /push/send endpoint. */
interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Fire-and-forget: send one or more push messages to the Expo Push service.
 * Accepts a single message (to: string | string[]) or an array of messages.
 *
 * After each batch is sent the function inspects per-ticket errors from the
 * Expo send response.  Any ticket that reports `DeviceNotRegistered` has its
 * token immediately nulled out in the database so future sends are not wasted
 * on dead registrations.
 */
export async function sendPush(
  messages: PushMessage | PushMessage[],
): Promise<void> {
  const payload = Array.isArray(messages) ? messages : [messages];
  // Filter out any empty token lists
  const filtered = payload.filter((m) => {
    if (Array.isArray(m.to)) return m.to.length > 0;
    return Boolean(m.to);
  });
  if (!filtered.length) return;

  // Flatten to one message per token so we can map send tickets back to the
  // specific token that caused a DeviceNotRegistered error.
  const flat: Array<{ msg: Omit<PushMessage, "to"> & { to: string }; token: string }> = [];
  for (const msg of filtered) {
    const tokens = Array.isArray(msg.to) ? msg.to : [msg.to];
    for (const token of tokens) {
      flat.push({ msg: { ...msg, to: token }, token });
    }
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        Accept:              "application/json",
        "Accept-Encoding":   "gzip, deflate",
        "X-Request-Source": "jai-api-server",
      },
      body: JSON.stringify(flat.map((f) => f.msg)),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "(unreadable)");
      logger.warn({ status: res.status, body: text }, "Expo push API error");
      return;
    }

    // Parse the send tickets and remove any token the device rejected.
    const json = await res.json().catch(() => null) as { data?: ExpoTicket[] } | null;
    const tickets: ExpoTicket[] = json?.data ?? [];

    const staleTokens: string[] = [];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token  = flat[i]?.token;
      if (
        ticket?.status  === "error" &&
        ticket?.details?.error === "DeviceNotRegistered" &&
        token
      ) {
        staleTokens.push(token);
      }
    }

    if (staleTokens.length > 0) {
      logger.info({ staleTokens }, "Removing DeviceNotRegistered push tokens");
      await Promise.all(
        staleTokens.map((token) =>
          db
            .update(users)
            .set({ push_token: null })
            .where(eq(users.push_token, token))
            .catch((err: unknown) => {
              logger.warn({ err, token }, "Failed to remove stale push token");
            }),
        ),
      );
    }
  } catch (err) {
    logger.warn({ err }, "Failed to reach Expo push API");
  }
}

// ── Domain-specific notification senders ──────────────────────────────────────

/**
 * Notify ALL technicians who have a push token that a new job is available.
 * Called after a new service request + job are created.
 */
export async function notifyTechniciansNewJob(opts: {
  serviceType:  string;
  address:      string | null | undefined;
  payout:       number;
  jobId:        number;
}): Promise<void> {
  try {
    const techs = await db
      .select({ push_token: users.push_token })
      .from(users)
      .where(
        // All technicians that have a push token registered
        // (eq role='technician' AND push_token IS NOT NULL AND push_token != '')
        eq(users.role, "technician"),
      );

    const tokens = techs
      .map((t) => t.push_token)
      .filter((t): t is string => t != null && t.length > 10);

    if (!tokens.length) return;

    const service = opts.serviceType.charAt(0).toUpperCase() + opts.serviceType.slice(1);
    const location = opts.address ? ` · ${opts.address}` : "";

    const title = `🚗 New job: ${service}${location}`;
    const body  = `SAR ${opts.payout} payout — tap to view`;
    const data  = { screen: "job", jobId: opts.jobId, type: "new_job" };

    await sendPush({ to: tokens, title, body, sound: "default", channelId: "jobs", data });

    // Persist notification history for each technician
    if (tokens.length) {
      const techIds = techs
        .filter((t) => t.push_token != null && t.push_token.length > 10)
        .map((t) => t.push_token as string);
      // Re-fetch user IDs for the token recipients
      const techUserRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "technician"));
      const inserts = techUserRows.map((t) => ({
        user_id: t.id, title, body, data,
      }));
      if (inserts.length) {
        await db.insert(notifications).values(inserts).catch(() => {});
      }
    }
  } catch (err) {
    logger.warn({ err }, "notifyTechniciansNewJob failed");
  }
}

/**
 * Notify a customer that a technician has accepted their job.
 */
export async function notifyCustomerJobAccepted(opts: {
  customerId:   number;
  techName:     string;
  serviceType:  string;
  jobId:        number;
  requestId:    number;
}): Promise<void> {
  try {
    const [customer] = await db
      .select({ push_token: users.push_token })
      .from(users)
      .where(eq(users.id, opts.customerId))
      .limit(1);

    if (!customer?.push_token) return;

    const service = opts.serviceType.charAt(0).toUpperCase() + opts.serviceType.slice(1);

    const title = `✅ Technician on the way!`;
    const body  = `${opts.techName} accepted your ${service} request and is heading to you.`;
    const data  = { screen: "tracking", jobId: opts.jobId, requestId: opts.requestId, type: "job_accepted" };

    await sendPush({ to: customer.push_token, title, body, sound: "default", channelId: "jobs", data });

    // Persist notification history
    const [cust] = await db.select({ id: users.id }).from(users).where(eq(users.id, opts.customerId)).limit(1);
    if (cust) {
      await db.insert(notifications).values({ user_id: cust.id, title, body, data }).catch(() => {});
    }
  } catch (err) {
    logger.warn({ err }, "notifyCustomerJobAccepted failed");
  }
}

/**
 * Notify a customer that their job has been completed.
 */
export async function notifyCustomerJobCompleted(opts: {
  customerId:  number;
  serviceType: string;
  payout:      number;
  requestId:   number;
}): Promise<void> {
  try {
    const [customer] = await db
      .select({ push_token: users.push_token })
      .from(users)
      .where(eq(users.id, opts.customerId))
      .limit(1);

    if (!customer?.push_token) return;

    const service = opts.serviceType.charAt(0).toUpperCase() + opts.serviceType.slice(1);

    const title = `🎉 Service completed!`;
    const body  = `Your ${service} service is done. SAR ${opts.payout} charged. Thank you for using JAI!`;
    const data  = { screen: "requests", requestId: opts.requestId, type: "job_completed" };

    await sendPush({ to: customer.push_token, title, body, sound: "default", channelId: "jobs", data });

    // Persist notification history
    const [cust] = await db.select({ id: users.id }).from(users).where(eq(users.id, opts.customerId)).limit(1);
    if (cust) {
      await db.insert(notifications).values({ user_id: cust.id, title, body, data }).catch(() => {});
    }
  } catch (err) {
    logger.warn({ err }, "notifyCustomerJobCompleted failed");
  }
}
