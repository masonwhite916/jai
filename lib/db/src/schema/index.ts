import {
  pgTable, serial, text, integer, real, timestamp, pgEnum,
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
  id:               serial("id").primaryKey(),
  phone:            text("phone").notNull().unique(),
  name:             text("name"),
  role:             userRoleEnum("role").notNull().default("customer"),
  membership:       membershipEnum("membership").notNull().default("none"),
  points:           integer("points").notNull().default(0),
  rating:           real("rating"),
  jobs_completed:   integer("jobs_completed").notNull().default(0),
  earnings_total:   integer("earnings_total").notNull().default(0),
  push_token:       text("push_token"),
  // DB-backed session token (no JWT needed)
  auth_token:       text("auth_token"),
  token_expires_at: timestamp("token_expires_at"),
  created_at:       timestamp("created_at").notNull().defaultNow(),
  updated_at:       timestamp("updated_at").notNull().defaultNow(),
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

// ── TypeScript types ──────────────────────────────────────────────────────────

export type User           = typeof users.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Job            = typeof jobs.$inferSelect;
export type InsertUser           = typeof users.$inferInsert;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;
export type InsertJob            = typeof jobs.$inferInsert;
