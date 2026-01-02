import express from "express"
import { verifyToken } from "../middleware/auth.js"
import { requireRole } from "../middleware/auth.js"
import { detectUserLocation } from "../controllers/locationController.js"

const router = express.Router()

// Public route - no authentication needed for location detection
router.get("/detect", verifyToken, requireRole(["COMMUTER", "CORPORATE"]), detectUserLocation)

export default router
