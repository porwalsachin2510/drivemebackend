import express from "express"
import {
    getWalletBalance,
    getWalletTransactions,
    addFundsToWallet,
    withdrawFromWallet,
    transferFunds,
    getWalletStatement,
    requestPayout,
    getUserPayouts
} from "../controllers/walletController.js"
import { verifyToken } from "../middleware/auth.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(verifyToken)

// Get wallet balance
router.get("/balance", getWalletBalance)

// Get wallet transactions
router.get("/transactions", getWalletTransactions)

// Add funds to wallet
router.post("/add-funds", addFundsToWallet)

// Withdraw from wallet
router.post("/withdraw", withdrawFromWallet)

// Transfer funds to another user
router.post("/transfer", transferFunds)

// Get wallet statement
router.get("/statement", getWalletStatement)

// Request payout
router.post("/payout", requestPayout)

// Get user payouts
router.get("/payouts", getUserPayouts)

export default router
