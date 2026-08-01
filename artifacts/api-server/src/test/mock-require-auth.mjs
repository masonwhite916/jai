/**
 * Test-only stub for the requireAuth middleware.
 * Reads req.userId from the x-test-user-id header (set by the test helper)
 * so we don't need real JWT tokens or DB session rows in payment gate tests.
 */

export async function requireAuth(req, res, next) {
  const uid = req.headers["x-test-user-id"];
  if (!uid) {
    res.status(401).json({ error: "Unauthorized (test: x-test-user-id missing)" });
    return;
  }
  req.userId   = Number(uid);
  req.userRole = "customer";
  next();
}
