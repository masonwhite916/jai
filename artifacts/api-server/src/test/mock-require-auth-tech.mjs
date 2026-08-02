/**
 * Test-only requireAuth stub for technician-role routes.
 * Sets req.userRole = "technician" so the technician guard in jobs.ts passes.
 */
export async function requireAuth(req, res, next) {
  const uid = req.headers["x-test-user-id"];
  if (!uid) {
    res.status(401).json({ error: "Unauthorized (test: x-test-user-id missing)" });
    return;
  }
  req.userId   = Number(uid);
  req.userRole = "technician";
  next();
}
