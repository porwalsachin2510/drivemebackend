import express from "express"
import { verifyToken } from "../middleware/auth.js"
import { getAllUsers, getCurrentUser } from "../controllers/userController.js"

const router = express.Router()

// Get all users (requires authentication)
router.get("/all", verifyToken, getAllUsers)

// Get current user
router.get("/me", verifyToken, getCurrentUser)

export default router
