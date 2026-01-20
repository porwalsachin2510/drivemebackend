import express from "express"
import {
    getWalletBalance,
    getWalletTransactions,
    requestPayout,
    getUserPayouts,
} from "../controllers/walletController.js"
import { verifyToken } from "../middleware/auth.js"

const router = express.Router()

// Get wallet balance
router.get("/wallet/balance", verifyToken, getWalletBalance)

// Get wallet transactions
router.get("/wallet/transactions", verifyToken, getWalletTransactions)

// Request payout
router.post("/wallet/payout", verifyToken, requestPayout)

// Get user payouts
router.get("/wallet/payouts", verifyToken, getUserPayouts)

export default router
