import Wallet from "../models/Wallet.js"
import User from "../models/User.js"
import Transaction from "../models/Transaction.js"
import { sendRealTimeNotification } from "../Services/socketService.js"
import { createNotification } from "./notificationController.js"

// Get wallet balance
export const getWalletBalance = async (req, res) => {
    try {
        
        const userId = req.userId
        const userRole = req.userRole
        
        // Find or create wallet for user
        let wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            wallet = new Wallet({
                userId,
                role: userRole,
                balance: 0,
                transactions: []
            })
            await wallet.save()
        }

        return res.status(200).json({
            success: true,
            data: {
                wallet,
                balance: wallet.balance
            }
        })
    } catch (error) {
        console.error("Error getting wallet balance:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while fetching wallet balance"
        })
    }
}

// Get wallet transactions
export const getWalletTransactions = async (req, res) => {
    try {
        const userId = req.userId
        const { page = 1, limit = 20 } = req.query

        const wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            })
        }

        const transactions = wallet.transactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice((page - 1) * limit, page * limit)

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page,
                    limit,
                    total: wallet.transactions.length,
                    pages: Math.ceil(wallet.transactions.length / limit)
                }
            }
        })
    } catch (error) {
        console.error("Error getting wallet transactions:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while fetching transactions"
        })
    }
}

// Add funds to wallet
export const addFundsToWallet = async (req, res) => {
    try {
        const userId = req.userId
        const { amount, paymentMethod, paymentDetails } = req.body

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            })
        }

        // Find or create wallet
        let wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            })
        }

        // Add transaction
        const transaction = {
            type: "DEPOSIT",
            amount: amount,
            description: `Funds added via ${paymentMethod}`,
            paymentMethod,
            status: "COMPLETED",
            createdAt: new Date()
        }

        wallet.transactions.push(transaction)
        wallet.balance += amount
        await wallet.save()

        // Send real-time notification
        await sendRealTimeNotification(userId, {
            type: "WALLET_UPDATED",
            title: "Funds Added",
            message: `${amount} KWD has been added to your wallet`,
            data: {
                newBalance: wallet.balance,
                transaction
            }
        })

        // Create notification
        await createNotification({
            userId,
            type: "PAYMENT_COMPLETED",
            title: "Funds Added Successfully",
            message: `${amount} KWD has been added to your wallet via ${paymentMethod}`,
            data: {
                amount,
                paymentMethod,
                newBalance: wallet.balance
            }
        })

        return res.status(200).json({
            success: true,
            message: "Funds added successfully",
            data: {
                wallet,
                transaction
            }
        })
    } catch (error) {
        console.error("Error adding funds to wallet:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while adding funds"
        })
    }
}

// Withdraw from wallet
export const withdrawFromWallet = async (req, res) => {
    try {
        const userId = req.userId
        const { amount, bankAccount } = req.body

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            })
        }

        // Find wallet
        const wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            })
        }

        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            })
        }

        // Add transaction
        const transaction = {
            type: "WITHDRAWAL",
            amount: -amount,
            description: `Withdrawal to bank account ${bankAccount}`,
            bankAccount,
            status: "PENDING",
            createdAt: new Date()
        }

        wallet.transactions.push(transaction)
        wallet.balance -= amount
        await wallet.save()

        // Send real-time notification
        await sendRealTimeNotification(userId, {
            type: "WALLET_UPDATED",
            title: "Withdrawal Initiated",
            message: `${amount} KWD withdrawal has been initiated`,
            data: {
                newBalance: wallet.balance,
                transaction
            }
        })

        // Create notification
        await createNotification({
            userId,
            type: "PAYMENT_COMPLETED",
            title: "Withdrawal Initiated",
            message: `${amount} KWD withdrawal has been initiated to your bank account`,
            data: {
                amount,
                bankAccount,
                newBalance: wallet.balance
            }
        })

        return res.status(200).json({
            success: true,
            message: "Withdrawal initiated successfully",
            data: {
                wallet,
                transaction
            }
        })
    } catch (error) {
        console.error("Error withdrawing from wallet:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while processing withdrawal"
        })
    }
}

// Transfer funds to another user
export const transferFunds = async (req, res) => {
    try {
        const userId = req.userId
        const { recipientId, amount, description } = req.body

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            })
        }

        if (!recipientId) {
            return res.status(400).json({
                success: false,
                message: "Recipient ID is required"
            })
        }

        if (recipientId === userId) {
            return res.status(400).json({
                success: false,
                message: "Cannot transfer to yourself"
            })
        }

        // Find sender wallet
        const senderWallet = await Wallet.findOne({ userId })
        if (!senderWallet) {
            return res.status(404).json({
                success: false,
                message: "Sender wallet not found"
            })
        }

        if (senderWallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            })
        }

        // Find recipient
        const recipient = await User.findById(recipientId)
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: "Recipient not found"
            })
        }

        // Find or create recipient wallet
        let recipientWallet = await Wallet.findOne({ userId: recipientId })
        if (!recipientWallet) {
            recipientWallet = new Wallet({
                userId: recipientId,
                balance: 0,
                transactions: []
            })
        }

        // Create transactions
        const senderTransaction = {
            type: "TRANSFER",
            amount: -amount,
            description: description || "Fund transfer",
            recipientId,
            recipientName: recipient.fullName,
            status: "COMPLETED",
            createdAt: new Date()
        }

        const recipientTransaction = {
            type: "TRANSFER",
            amount: amount,
            description: description || "Fund transfer",
            senderId: userId,
            senderName: req.user?.fullName || "User",
            status: "COMPLETED",
            createdAt: new Date()
        }

        // Update wallets
        senderWallet.transactions.push(senderTransaction)
        senderWallet.balance -= amount

        recipientWallet.transactions.push(recipientTransaction)
        recipientWallet.balance += amount

        await senderWallet.save()
        await recipientWallet.save()

        // Send notifications to both users
        await sendRealTimeNotification(userId, {
            type: "WALLET_UPDATED",
            title: "Transfer Sent",
            message: `${amount} KWD has been sent to ${recipient.fullName}`,
            data: {
                newBalance: senderWallet.balance,
                transaction: senderTransaction
            }
        })

        await sendRealTimeNotification(recipientId, {
            type: "WALLET_UPDATED",
            title: "Transfer Received",
            message: `${amount} KWD has been received from ${req.user?.fullName || "User"}`,
            data: {
                newBalance: recipientWallet.balance,
                transaction: recipientTransaction
            }
        })

        // Create notifications
        await createNotification({
            userId,
            type: "PAYMENT_COMPLETED",
            title: "Transfer Sent",
            message: `${amount} KWD has been sent to ${recipient.fullName}`,
            data: {
                amount,
                recipientId,
                recipientName: recipient.fullName,
                newBalance: senderWallet.balance
            }
        })

        await createNotification({
            userId: recipientId,
            type: "PAYMENT_RECEIVED",
            title: "Transfer Received",
            message: `${amount} KWD has been received from ${req.user?.fullName || "User"}`,
            relatedUserId: userId,
            data: {
                amount,
                senderId: userId,
                senderName: req.user?.fullName || "User",
                newBalance: recipientWallet.balance
            }
        })

        return res.status(200).json({
            success: true,
            message: "Transfer completed successfully",
            data: {
                wallet: senderWallet,
                transaction: senderTransaction
            }
        })
    } catch (error) {
        console.error("Error transferring funds:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while processing transfer"
        })
    }
}

// Get wallet statement
export const getWalletStatement = async (req, res) => {
    try {
        const userId = req.userId
        const { startDate, endDate, page = 1, limit = 20 } = req.query

        const wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            })
        }

        // Filter transactions by date range
        let filteredTransactions = wallet.transactions

        if (startDate) {
            const start = new Date(startDate)
            filteredTransactions = filteredTransactions.filter(
                tx => new Date(tx.createdAt) >= start
            )
        }

        if (endDate) {
            const end = new Date(endDate)
            filteredTransactions = filteredTransactions.filter(
                tx => new Date(tx.createdAt) <= end
            )
        }

        // Sort and paginate
        filteredTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        const transactions = filteredTransactions.slice((page - 1) * limit, page * limit)

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page,
                    limit,
                    total: filteredTransactions.length,
                    pages: Math.ceil(filteredTransactions.length / limit)
                }
            }
        })
    } catch (error) {
        console.error("Error getting wallet statement:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while fetching wallet statement"
        })
    }
}

// Request payout
export const requestPayout = async (req, res) => {
    try {
        const userId = req.userId
        const { amount, bankAccount, payoutMethod } = req.body

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            })
        }

        // Find wallet
        const wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            })
        }

        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            })
        }

        // Create payout transaction
        const transaction = {
            type: "PAYOUT",
            amount: -amount,
            description: `Payout request via ${payoutMethod || "bank transfer"}`,
            bankAccount,
            payoutMethod,
            status: "PENDING",
            createdAt: new Date()
        }

        wallet.transactions.push(transaction)
        wallet.balance -= amount
        await wallet.save()

        // Send notification
        await sendRealTimeNotification(userId, {
            type: "WALLET_UPDATED",
            title: "Payout Requested",
            message: `${amount} KWD payout request has been submitted`,
            data: {
                newBalance: wallet.balance,
                transaction
            }
        })

        await createNotification({
            userId,
            type: "PAYMENT_COMPLETED",
            title: "Payout Requested",
            message: `${amount} KWD payout request has been submitted for processing`,
            data: {
                amount,
                bankAccount,
                payoutMethod,
                newBalance: wallet.balance
            }
        })

        return res.status(200).json({
            success: true,
            message: "Payout request submitted successfully",
            data: {
                wallet,
                transaction
            }
        })
    } catch (error) {
        console.error("Error requesting payout:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while requesting payout"
        })
    }
}

// Get user payouts
export const getUserPayouts = async (req, res) => {
    try {
        const userId = req.userId
        const { page = 1, limit = 20 } = req.query

        const wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            })
        }

        // Filter payout transactions
        const payouts = wallet.transactions
            .filter(tx => tx.type === "PAYOUT")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice((page - 1) * limit, page * limit)

        return res.status(200).json({
            success: true,
            data: {
                payouts,
                pagination: {
                    page,
                    limit,
                    total: wallet.transactions.filter(tx => tx.type === "PAYOUT").length,
                    pages: Math.ceil(wallet.transactions.filter(tx => tx.type === "PAYOUT").length / limit)
                }
            }
        })
    } catch (error) {
        console.error("Error getting user payouts:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while fetching payouts"
        })
    }
}

