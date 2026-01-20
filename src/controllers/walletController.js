import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import Payout from "../models/Payout.js"

// Get wallet balance
export const getWalletBalance = async (req, res) => {
    try {
        const userId = req.user.userId

        let wallet = await Wallet.findOne({ userId })

        if (!wallet) {
            wallet = await Wallet.create({
                userId,
                balance: 0,
                currency: "AED",
            })
        }

        return res.status(200).json({
            success: true,
            data: { wallet },
        })
    } catch (error) {
        console.error("[v0] Error fetching wallet:", error)
        return res.status(500).json({
            success: false,
            message: "Failed to fetch wallet",
            error: error.message,
        })
    }
}

// Get wallet transactions
export const getWalletTransactions = async (req, res) => {
    try {
        const userId = req.user.userId
        const { page = 1, limit = 20 } = req.query

        const wallet = await Wallet.findOne({ userId })

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            })
        }

        const transactions = await Transaction.find({ walletId: wallet._id })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate("referenceId")

        const count = await Transaction.countDocuments({ walletId: wallet._id })

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalTransactions: count,
            },
        })
    } catch (error) {
        console.error("[v0] Error fetching transactions:", error)
        return res.status(500).json({
            success: false,
            message: "Failed to fetch transactions",
            error: error.message,
        })
    }
}

// Request payout
export const requestPayout = async (req, res) => {
    try {
        console.log("[v0] Payout request received")
        const userId = req.user.userId
        const { amount, payoutMethod, bankDetails, walletDetails } = req.body

        console.log("[v0] User ID:", userId)
        console.log("[v0] Amount:", amount)
        console.log("[v0] Payout Method:", payoutMethod)

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount",
            })
        }

        // Get wallet
        const wallet = await Wallet.findOne({ userId })

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            })
        }

        // Check balance
        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance",
            })
        }

        // Check pending payouts
        const pendingPayout = await Payout.findOne({
            userId,
            status: { $in: ["PENDING", "PROCESSING"] },
        })

        if (pendingPayout) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending payout request",
            })
        }

        // Create payout request
        const payout = await Payout.create({
            userId,
            walletId: wallet._id,
            amount,
            currency: wallet.currency,
            payoutMethod,
            bankDetails,
            walletDetails,
            status: "PENDING",
        })

        // Update wallet pending amount
        wallet.pendingAmount += amount
        await wallet.save()

        console.log("[v0] Payout requested:", payout._id)

        return res.status(201).json({
            success: true,
            message: "Payout request submitted successfully",
            data: { payout },
        })
    } catch (error) {
        console.error("[v0] Error requesting payout:", error)
        return res.status(500).json({
            success: false,
            message: "Failed to request payout",
            error: error.message,
        })
    }
}

// Get user payouts
export const getUserPayouts = async (req, res) => {
    try {
        const userId = req.user.userId
        const { page = 1, limit = 20 } = req.query

        const payouts = await Payout.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate("processedBy", "username email")

        const count = await Payout.countDocuments({ userId })

        return res.status(200).json({
            success: true,
            data: {
                payouts,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                totalPayouts: count,
            },
        })
    } catch (error) {
        console.error("[v0] Error fetching payouts:", error)
        return res.status(500).json({
            success: false,
            message: "Failed to fetch payouts",
            error: error.message,
        })
    }
}
