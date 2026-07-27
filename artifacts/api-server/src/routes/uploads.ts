import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

const router: IRouter = Router();

const UPLOAD_DIR = path.join(__dirname, "../../public/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * POST /api/uploads
 * Body: { base64: string, mimeType: string }
 * Returns: { url: string }  — relative URL like /uploads/abc123.jpg
 */
router.post("/uploads", requireAuth, (req, res) => {
  try {
    const { base64, mimeType } = req.body as { base64?: string; mimeType?: string };
    if (!base64 || !mimeType) {
      res.status(400).json({ error: "base64 and mimeType are required" });
      return;
    }
    const ext = EXT_MAP[mimeType] ?? ".jpg";
    const filename = `${Date.now()}_${randomBytes(6).toString("hex")}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Strip data-URI prefix if present
    const data = base64.replace(/^data:[^;]+;base64,/, "");
    fs.writeFileSync(filepath, Buffer.from(data, "base64"));

    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
