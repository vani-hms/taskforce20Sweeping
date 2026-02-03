import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "../middleware/auth";

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve static files from uploads
// This should probably be in server.ts but we can define the route here or just reference it
router.post("/upload", authenticate, upload.single("photo"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate a URL that can be reached from the mobile app
    // In a real production app, this would be a cloud storage URL (S3, etc)
    // For local dev, we return the filename which the frontend construction of base URL will use
    const photoUrl = `/uploads/${req.file.filename}`;
    res.json({ url: photoUrl });
});

export default router;
