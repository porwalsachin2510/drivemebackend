import express from "express"
const router = express.Router()
import {
    getPendingPayments,
    getPaymentDetails,
    verifyPayment,
    getAllContracts,
    getDashboardStats,
} from "../controllers/adminController.js";
import { verifyToken, checkAdminRole } from "../middleware/auth.js"

// Dashboard
router.get("/dashboard/stats", verifyToken, checkAdminRole, getDashboardStats)

// Payments
router.get("/payments/pending", verifyToken, checkAdminRole, getPendingPayments)
router.get("/payments/:paymentId", verifyToken, checkAdminRole, getPaymentDetails)
router.put("/payments/:paymentId/verify", verifyToken, checkAdminRole, verifyPayment)

// Contracts
router.get("/contracts", verifyToken, checkAdminRole, getAllContracts)

export default router
