import {
  pgTable, serial, text, integer, real, timestamp, pgEnum, boolean, jsonb, uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["customer", "technician"]);
export const membershipEnum = pgEnum("membership_tier", [
  "none", "basic", "premium", "accidents", "rental",
]);
export const serviceTypeEnum = pgEnum("service_type", [
  "tow", "battery", "tire", "fuel", "lockout", "mechanic", "electric",
]);
export const requestStatusEnum = pgEnum("request_status", [
  "pending", "assigned", "in_progress", "completed", "cancelled",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "pending", "accepted", "en_route", "arrived", "working", "completed", "cancelled",
]);

// ── Tables ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:             serial("id").primaryKey(),
  phone:          text("phone").notNull().unique(),
  name:           text("name"),
  role:           userRoleEnum("role").notNull().default("customer"),
  membership:     membershipEnum("membership").notNull().default("none"),
  points:         integer("points").notNull().default(0),
  rating:         real("rating"),
  jobs_completed: integer("jobs_completed").notNull().default(0),
  earnings_total: integer("earnings_total").notNull().default(0),
  push_token:     text("push_token"),
  created_at:     timestamp("created_at").notNull().defaultNow(),
  updated_at:     timestamp("updated_at").notNull().defaultNow(),
});

export const serviceRequests = pgTable("service_requests", {
  id:            serial("id").primaryKey(),
  customer_id:   integer("customer_id").notNull().references(() => users.id),
  service_type:  serviceTypeEnum("service_type").notNull(),
  status:        requestStatusEnum("status").notNull().default("pending"),
  // Vehicle info snapshot
  vehicle_make:  text("vehicle_make"),
  vehicle_model: text("vehicle_model"),
  vehicle_year:  text("vehicle_year"),
  vehicle_plate: text("vehicle_plate"),
  vehicle_color: text("vehicle_color"),
  // Location
  location_lat:  real("location_lat"),
  location_lng:  real("location_lng"),
  address:       text("address"),
  notes:         text("notes"),
  photo_urls:    text("photo_urls"),   // JSON array of upload paths
  payment_id:     text("payment_id").unique(), // Moyasar payment ID — unique to prevent replay (null = covered/cash)
  payment_method: text("payment_method"),          // 'card' | 'cash' | 'covered'
  promo_code:           text("promo_code"),             // validated promo code applied at checkout (if any)
  discount_amount:      integer("discount_amount"),    // discount in halalas (SAR × 100) — integer avoids fraction rounding
  final_amount_halalas: integer("final_amount_halalas"), // canonical customer-payable amount in halalas
  created_at:    timestamp("created_at").notNull().defaultNow(),
  updated_at:    timestamp("updated_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id:             serial("id").primaryKey(),
  request_id:     integer("request_id").notNull().references(() => serviceRequests.id),
  technician_id:  integer("technician_id").references(() => users.id),
  status:         jobStatusEnum("status").notNull().default("pending"),
  payout:         integer("payout").notNull().default(0),
  distance_km:    real("distance_km"),
  eta_min:        integer("eta_min"),
  accepted_at:    timestamp("accepted_at"),
  completed_at:   timestamp("completed_at"),
  created_at:     timestamp("created_at").notNull().defaultNow(),
  updated_at:     timestamp("updated_at").notNull().defaultNow(),
});

// ── Technician vehicles ───────────────────────────────────────────────────────

export const vehicles = pgTable("vehicles", {
  id:         serial("id").primaryKey(),
  user_id:    integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  make:       text("make").notNull(),
  model:      text("model").notNull(),
  year:       text("year").notNull(),
  plate:      text("plate").notNull(),
  color:      text("color").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ── User sessions ─────────────────────────────────────────────────────────────

export const userSessions = pgTable("user_sessions", {
  id:          serial("id").primaryKey(),
  user_id:     integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token_hash:  text("token_hash").notNull().unique(),
  device_name: text("device_name"),
  platform:    text("platform"),
  ip_address:  text("ip_address"),
  created_at:  timestamp("created_at").notNull().defaultNow(),
  last_used_at: timestamp("last_used_at").notNull().defaultNow(),
  expires_at:  timestamp("expires_at").notNull(),
  revoked_at:  timestamp("revoked_at"),
});

// ── Admin sessions (DB-backed, survives restarts) ─────────────────────────────

export const adminSessions = pgTable("admin_sessions", {
  token:      text("token").primaryKey(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Technician last-known locations ───────────────────────────────────────────

export const technicianLocations = pgTable("technician_locations", {
  user_id:       integer("user_id").primaryKey().references(() => users.id),
  lat:           real("lat").notNull(),
  lng:           real("lng").notNull(),
  seen_at:       timestamp("seen_at").notNull().defaultNow(),
  last_moved_at: timestamp("last_moved_at").notNull().defaultNow(),
});

// ── Notification history ───────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id:         serial("id").primaryKey(),
  user_id:    integer("user_id").notNull().references(() => users.id),
  title:      text("title").notNull(),
  body:       text("body").notNull(),
  data:       jsonb("data"),
  read:       boolean("read").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Site settings (key-value, DB-backed) ──────────────────────────────────────

export const siteSettings = pgTable("site_settings", {
  key:        text("key").primaryKey(),
  value:      text("value").notNull(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ── Job chat messages ─────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id:          serial("id").primaryKey(),
  job_id:      integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  sender_id:   integer("sender_id").notNull().references(() => users.id),
  sender_role: text("sender_role").notNull(), // 'customer' | 'technician'
  sender_name: text("sender_name"),
  text:        text("text").notNull(),
  created_at:  timestamp("created_at").notNull().defaultNow(),
});

// ── Job ratings ───────────────────────────────────────────────────────────────

export const jobRatings = pgTable("job_ratings", {
  id:         serial("id").primaryKey(),
  job_id:     integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  rater_id:   integer("rater_id").notNull().references(() => users.id),
  ratee_id:   integer("ratee_id").notNull().references(() => users.id),
  rater_role: text("rater_role").notNull(), // 'customer' | 'technician'
  stars:      integer("stars").notNull(),   // 1–5
  comment:    text("comment"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ── Apple Pay service sessions (auth → browser bridge, DB-backed) ─────────────
// Created by POST /api/payment/service-applepay-session (requireAuth).
// Consumed once by GET /api/payment/service-applepay-form?token=...
// Prevents user_id spoofing via open query params.

export const applePaySessions = pgTable("applepay_sessions", {
  token:        text("token").primaryKey(),
  user_id:      integer("user_id").notNull().references(() => users.id),
  service_type: text("service_type").notNull(),
  ref:          text("ref").notNull(),
  expires_at:   timestamp("expires_at", { withTimezone: true }).notNull(),
  created_at:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApplePaySession = typeof applePaySessions.$inferSelect;

// ── Apple Pay service payment refs (webhook → poll bridge, DB-backed) ─────────
// A webhook deposits the completed payment_id keyed by the app's ref UUID.
// The app polls service-ref-lookup until the ref appears or TTL expires.

export const servicePaymentRefs = pgTable("service_payment_refs", {
  ref:        text("ref").primaryKey(),
  payment_id: text("payment_id").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServicePaymentRef = typeof servicePaymentRefs.$inferSelect;

// ── Promo code usage tracking (per-user, single-use enforcement) ──────────────
// One row per (user_id, code) — unique constraint prevents double-use.

export const promoUses = pgTable("promo_uses", {
  id:      serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code:    text("code").notNull(),
  used_at: timestamp("used_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("promo_uses_user_id_code_key").on(t.user_id, t.code),
]);

// ── TypeScript types ──────────────────────────────────────────────────────────

export type User           = typeof users.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Job            = typeof jobs.$inferSelect;
export type InsertUser           = typeof users.$inferInsert;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;
export type InsertJob            = typeof jobs.$inferInsert;
