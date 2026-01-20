import Payment from "../models/Payment.js";
import Contract from "../models/Contract.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import PaymentSchedule from "../models/PaymentSchedule.js" 

// Get all pending payments for admin verification
export const getPendingPayments = async (req, res) => {
    try {
        const payments = await Payment.find({
            status: "PENDING",
            verificationStatus: "PENDING",
        })
            .populate("contractId", "contractNumber")
            .populate("corporateOwnerId", "fullName companyName email phone")
            .populate("fleetOwnerId", "fullName companyName email phone")
            .sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            count: payments.length,
            payments,
        })
    } catch (error) {
        console.error("[v0] Error fetching pending payments:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching pending payments",
            error: error.message,
        })
    }
}

// Get payment details for verification
export const getPaymentDetails = async (req, res) => {
    try {
        const { paymentId } = req.params

        const payment = await Payment.findById(paymentId)
            .populate("contractId")
            .populate("corporateOwnerId", "fullName companyName email whatsappNumber company")
            .populate("fleetOwnerId", "fullName companyName email whatsappNumber company")

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            })
        }

        res.status(200).json({
            success: true,
            payment,
        })
    } catch (error) {
        console.error("[v0] Error fetching payment details:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching payment details",
            error: error.message,
        })
    }
}

// // Verify and approve payment
// export const verifyPayment = async (req, res) => {
//     try {
//         const { paymentId } = req.params
//         const { action, reason } = req.body // action: 'APPROVE' or 'REJECT'

//         const payment = await Payment.findById(paymentId).populate("contractId")

//         if (!payment) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Payment not found",
//             })
//         }

//         if (payment.verificationStatus !== "PENDING") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Payment already verified",
//             })
//         }

//         if (action === "APPROVE") {
//             payment.status = "COMPLETED"
//             payment.verificationStatus = "VERIFIED"
//             payment.verifiedBy = req.userId
//             payment.verifiedAt = new Date()

//             // Calculate commission split
//             const adminCommissionAmount = (payment.amount * 20) / 100
//             const fleetOwnerAmount = (payment.amount * 80) / 100

//             payment.adminCommission = adminCommissionAmount
//             payment.fleetOwnerAmount = fleetOwnerAmount,


//             await payment.save()

//             // Update wallets
//             let adminWallet = await Wallet.findOne({ userId: req.userId, role: "ADMIN" })
//             if (!adminWallet) {
//                 adminWallet = new Wallet({
//                     userId: req.userId,
//                     role: "ADMIN",
//                     balance: 0,
//                 })
//             }
//             const adminBalanceBefore = adminWallet.balance
//             adminWallet.balance += adminCommissionAmount
//             const adminBalanceAfter = adminWallet.balance

//             adminWallet.currency = payment.currency
//             await adminWallet.save()

//             let fleetWallet = await Wallet.findOne({
//                 userId: payment.fleetOwnerId,
//                 role: "B2B_PARTNER",
//             })
//             if (!fleetWallet) {
//                 fleetWallet = new Wallet({
//                     userId: payment.fleetOwnerId,
//                     role: "B2B_PARTNER",
//                     balance: 0,
//                 })
//             }

//             const fleetBalanceBefore = fleetWallet.balance
//             fleetWallet.balance += fleetOwnerAmount
//             const fleetBalanceAfter = fleetWallet.balance

//             fleetWallet.currency = payment.currency
//             await fleetWallet.save()

//             // Create transaction records
//             await Transaction.create([
//                 {
//                     userId: req.userId,
//                     walletId: adminWallet._id,
//                     type: "CREDIT",
//                     category: "COMMISSION_EARNED",
//                     amount: adminCommissionAmount,
//                     balanceBefore: adminBalanceBefore,
//                     balanceAfter: adminBalanceAfter,
//                     paymentId: payment._id,
//                     contractId: payment.contractId,
//                     description: `Admin commission for contract ${payment.contractId.contractNumber}`,
//                 },
//                 {
//                     userId: payment.fleetOwnerId,
//                     walletId: fleetWallet._id,
//                     type: "CREDIT",
//                     category: "PAYMENT_RECEIVED",
//                     amount: fleetOwnerAmount,
//                     balanceBefore: fleetBalanceBefore,
//                     balanceAfter: fleetBalanceAfter,
//                     paymentId: payment._id,
//                     contractId: payment.contractId,
//                     description: `Rental payment for contract ${payment.contractId.contractNumber}`,
//                 },
//             ])

//             // Update contract status
//             const contract = await Contract.findById(payment.contractId)
//             if (contract) {
//                 // Update financial details
//                 if (payment.paymentType === "advance") {
//                     contract.financials.advancePayment.paidAt = new Date()
//                     contract.financials.advancePayment.transactionId = payment.gatewayTransactionId
//                     contract.status = "ACTIVE" // Waiting for final payment
//                 } else if (payment.paymentType === "final") {
//                     contract.financials.finalPayment.paidAt = new Date()
//                     contract.financials.finalPayment.transactionId = payment.gatewayTransactionId
//                     contract.status = "ACTIVE" // Contract is now active
//                     contract.activatedAt = new Date()
//                 } else if (payment.paymentType === "security") {
//                     contract.financials.securityDeposit.paidAt = new Date()
//                 }

//                 contract.statusHistory.push({
//                     status: contract.status,
//                     changedAt: new Date(),
//                     changedBy: req.userId,
//                     reason: `Payment ${action.toLowerCase()}d by admin`,
//                 })

//                 await contract.save()
//             }

//             res.status(200).json({
//                 success: true,
//                 message: "Payment verified and approved successfully",
//                 payment,
//             })
//         } else if (action === "REJECT") {
//             payment.status = "FAILED"
//             payment.verificationStatus = "REJECTED"
//             payment.verifiedBy = req.userId
//             payment.verifiedAt = new Date()
//             payment.failureReason = reason

//             await payment.save()

//             // Update contract status
//             const contract = await Contract.findById(payment.contractId)
//             if (contract) {
//                 contract.statusHistory.push({
//                     status: "PAYMENT_REJECTED",
//                     changedAt: new Date(),
//                     changedBy: req.userId,
//                     reason: reason,
//                 })
//                 await contract.save()
//             }

//             res.status(200).json({
//                 success: true,
//                 message: "Payment rejected",
//                 payment,
//             })
//         }
//     } catch (error) {
//         console.error("[v0] Error verifying payment:", error)
//         res.status(500).json({
//             success: false,
//             message: "Error verifying payment",
//             error: error.message,
//         })
//     }
// }

// export const verifyPayment = async (req, res) => {
//     try {
//         const { paymentId } = req.params
//         const { action, reason } = req.body // action: 'APPROVE' or 'REJECT'

//         const payment = await Payment.findById(paymentId).populate("contractId")

//         if (!payment) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Payment not found",
//             })
//         }

//         if (payment.verificationStatus !== "PENDING") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Payment already verified",
//             })
//         }

//         if (action === "APPROVE") {
//             payment.status = "COMPLETED"
//             payment.verificationStatus = "VERIFIED"
//             payment.verifiedBy = req.userId
//             payment.verifiedAt = new Date()

//             const advanceAmount = payment.contractId.financials.advancePayment.amount
//             const securityDepositAmount = payment.contractId.financials.securityDeposit.amount

//             // Commission: 10% of advance only
//             const adminCommissionAmount = payment.adminCommission // Already calculated as 10% of advance
//             // Fleet owner gets: 90% of advance
//             const fleetOwnerAmount = payment.fleetOwnerAmount // Already calculated as 90% of advance

//             console.log("[v0] Verifying Payment Breakdown:")
//             console.log("[v0] Advance Amount:", advanceAmount)
//             console.log("[v0] Security Deposit (held separately):", securityDepositAmount)
//             console.log("[v0] Admin Commission (10% of advance):", adminCommissionAmount)
//             console.log("[v0] Fleet Owner Amount (90% of advance):", fleetOwnerAmount)

//             payment.adminCommission = {
//                 amount: adminCommissionAmount,
//                 percentage: 10,
//                 appliedOn: "advance",
//             }
//             payment.fleetOwnerShare = {
//                 amount: fleetOwnerAmount,
//                 percentage: 90,
//                 appliedOn: "advance",
//             }
//             payment.securityDepositInfo = {
//                 amount: securityDepositAmount,
//                 status: "HELD",
//                 refundable: true,
//             }

//             await payment.save()

//             // Update Admin Wallet - Commission only
//             let adminWallet = await Wallet.findOne({ userId: req.userId, role: "ADMIN" })
//             if (!adminWallet) {
//                 adminWallet = new Wallet({
//                     userId: req.userId,
//                     role: "ADMIN",
//                     balance: 0,
//                     securityDepositHeld: 0,
//                 })
//             }
//             adminWallet.balance += adminCommissionAmount
//             adminWallet.securityDepositHeld += securityDepositAmount
//             await adminWallet.save()

//             console.log(
//                 "[v0] Admin wallet updated - Commission:",
//                 adminCommissionAmount,
//                 "Security Deposit Held:",
//                 securityDepositAmount,
//             )

//             // Update Fleet Owner Wallet - Only 90% of advance
//             let fleetWallet = await Wallet.findOne({
//                 userId: payment.fleetOwnerId,
//                 role: "B2B_PARTNER",
//             })
//             if (!fleetWallet) {
//                 fleetWallet = new Wallet({
//                     userId: payment.fleetOwnerId,
//                     role: "B2B_PARTNER",
//                     balance: 0,
//                 })
//             }
//             fleetWallet.balance += fleetOwnerAmount
//             await fleetWallet.save()

//             console.log("[v0] Fleet owner wallet updated:", fleetOwnerAmount)

//             // Create transaction records
//             await Transaction.create([
//                 {
//                     userId: req.userId,
//                     walletId: adminWallet._id,
//                     type: "CREDIT",
//                     category: "COMMISSION",
//                     amount: adminCommissionAmount,
//                     balance: adminWallet.balance,
//                     paymentId: payment._id,
//                     contractId: payment.contractId,
//                     description: `Admin commission (10% of advance) for contract ${payment.contractId.contractNumber}`,
//                 },
//                 {
//                     userId: payment.fleetOwnerId,
//                     walletId: fleetWallet._id,
//                     type: "CREDIT",
//                     category: "RENTAL_INCOME",
//                     amount: fleetOwnerAmount,
//                     balance: fleetWallet.balance,
//                     paymentId: payment._id,
//                     contractId: payment.contractId,
//                     description: `Rental income (90% of advance) for contract ${payment.contractId.contractNumber}`,
//                 },
//                 {
//                     userId: req.userId,
//                     walletId: adminWallet._id,
//                     type: "HOLD",
//                     category: "SECURITY_DEPOSIT",
//                     amount: securityDepositAmount,
//                     balance: adminWallet.securityDepositHeld,
//                     paymentId: payment._id,
//                     contractId: payment.contractId,
//                     description: `Security deposit held (refundable) for contract ${payment.contractId.contractNumber}`,
//                 },
//             ])

//             const contract = payment.contractId
//             contract.financials.advancePayment.status = "PAID"
//             contract.financials.advancePayment.paidAt = new Date()
//             contract.financials.advancePayment.paidVia = payment.paymentMethod
//             contract.financials.advancePayment.transactionId = payment._id

//             contract.financials.securityDeposit.status = "PAID"
//             contract.financials.securityDeposit.paidAt = new Date()
//             contract.financials.securityDeposit.paidVia = payment.paymentMethod
//             contract.financials.securityDeposit.transactionId = payment._id

//             contract.status = "ACTIVE"
//             contract.vehicleAccess.isActive = true
//             contract.activatedAt = new Date()

//             // Schedule final payment for 30 days later
//             const dueDate = new Date()
//             dueDate.setDate(dueDate.getDate() + 30)
//             contract.financials.remainingPayment.dueDate = dueDate

//             contract.statusHistory.push({
//                 status: "ACTIVE",
//                 changedAt: new Date(),
//                 changedBy: req.userId,
//                 reason: "Payment verified - contract activated after advance + security deposit received",
//             })

//             await contract.save()

//             console.log("[v0] Contract updated to ACTIVE status")

//             return res.status(200).json({
//                 success: true,
//                 message: "Payment verified successfully",
//                 data: {
//                     payment,
//                     paymentBreakdown: {
//                         advanceAmount,
//                         securityDepositAmount,
//                         adminCommission: adminCommissionAmount,
//                         fleetOwnerAmount,
//                     },
//                 },
//             })
//         } else if (action === "REJECT") {
//             payment.status = "FAILED"
//             payment.verificationStatus = "REJECTED"
//             payment.verifiedBy = req.userId
//             payment.verifiedAt = new Date()
//             payment.failureReason = reason || "Payment rejected by admin"

//             await payment.save()

//             return res.status(200).json({
//                 success: true,
//                 message: "Payment rejected",
//                 data: { payment },
//             })
//         } else {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid action. Must be 'APPROVE' or 'REJECT'",
//             })
//         }
//     } catch (error) {
//         console.error("[v0] Verify payment error:", error)
//         res.status(500).json({
//             success: false,
//             message: "Error verifying payment",
//             error: error.message,
//         })
//     }
// }

// Verify and approve payment
export const verifyPayment = async (req, res) => {
    try {
        const { paymentId } = req.params
        const { action, reason } = req.body // action: 'APPROVE' or 'REJECT'

        const payment = await Payment.findById(paymentId).populate("contractId")

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            })
        }

        if (payment.verificationStatus !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Payment already verified",
            })
        }

        if (action === "APPROVE") {
            payment.status = "COMPLETED"
            payment.verificationStatus = "VERIFIED"
            payment.verifiedBy = req.userId
            payment.verifiedAt = new Date()

            const advanceAmount = payment.advanceAmount
            const securityDepositAmount = payment.securityDepositAmount

            // Commission: 10% of advance only

            const adminCommissionAmount = payment.adminCommission // Already calculated as 10% of advance
            // Fleet owner gets: 90% of advance
            const fleetOwnerAmount = payment.fleetOwnerAmount // Already calculated as 90% of advance

            console.log("[v0] Verifying Payment Breakdown:")
            console.log("[v0] Advance Amount:", advanceAmount)
            console.log("[v0] Security Deposit (held separately):", securityDepositAmount)
            console.log("[v0] Admin Commission (10% of advance):", adminCommissionAmount)
            console.log("[v0] Fleet Owner Amount (90% of advance):", fleetOwnerAmount)

            payment.adminCommission = {
                amount: adminCommissionAmount,
                percentage: 10,
                appliedOn: "advance",
            }
            payment.fleetOwnerShare = {
                amount: fleetOwnerAmount,
                percentage: 90,
                appliedOn: "advance",
            }
            payment.securityDepositInfo = {
                amount: securityDepositAmount,
                status: "HELD",
                refundable: true,
            }

            await payment.save()

            // Update Admin Wallet - Commission only
            let adminWallet = await Wallet.findOne({ userId: req.userId, role: "ADMIN" })
            if (!adminWallet) {
                adminWallet = new Wallet({
                    userId: req.userId,
                    role: "ADMIN",
                    balance: 0,
                    securityDepositHeld: 0,
                })
            }

            // const adminBalanceBefore = adminWallet.balance
            // adminWallet.balance += adminCommissionAmount
            // adminWallet.securityDepositHeld += securityDepositAmount
            // const adminBalanceAfter = adminWallet.balance

            const adminBalanceBefore = adminWallet.balance
            const adminSecurityBefore = adminWallet.securityDepositHeld

            adminWallet.balance += adminCommissionAmount
            adminWallet.securityDepositHeld += securityDepositAmount

            const adminBalanceAfter = adminWallet.balance
            const adminSecurityAfter = adminWallet.securityDepositHeld
            await adminWallet.save()

            console.log(
                "[v0] Admin wallet updated - Commission:",
                adminCommissionAmount,
                "Security Deposit Held:",
                securityDepositAmount,
            )

            // Update Fleet Owner Wallet - Only 90% of advance
            let fleetWallet = await Wallet.findOne({
                userId: payment.fleetOwnerId,
                role: "B2B_PARTNER",
            })
            if (!fleetWallet) {
                fleetWallet = new Wallet({
                    userId: payment.fleetOwnerId,
                    role: "B2B_PARTNER",
                    balance: 0,
                })
            }

            const fleetBalanceBefore = fleetWallet.balance
            fleetWallet.balance += fleetOwnerAmount
            const fleetBalanceAfter = fleetWallet.balance
            await fleetWallet.save()

            console.log("[v0] Fleet owner wallet updated:", fleetOwnerAmount)

            // Create transaction records
            await Transaction.create([
                {
                    userId: req.userId,
                    walletId: adminWallet._id,
                    type: "CREDIT",
                    category: "COMMISSION_EARNED",
                    amount: adminCommissionAmount,
                    balance: adminWallet.balance,
                    balanceBefore: adminBalanceBefore,
                    balanceAfter: adminBalanceAfter,
                    paymentId: payment._id,
                    contractId: payment.contractId,
                    description: `Admin commission (10% of advance) for contract ${payment.contractId.contractNumber}`,
                },
                {
                    userId: payment.fleetOwnerId,
                    walletId: fleetWallet._id,
                    type: "CREDIT",
                    category: "PAYMENT_RECEIVED",
                    amount: fleetOwnerAmount,
                    balance: fleetWallet.balance,
                    balanceBefore: fleetBalanceBefore,
                    balanceAfter: fleetBalanceAfter,
                    paymentId: payment._id,
                    contractId: payment.contractId,
                    description: `Rental income (90% of advance) for contract ${payment.contractId.contractNumber}`,
                },
                {
                    userId: req.userId,
                    walletId: adminWallet._id,
                    type: "HOLD",
                    category: "SECURITY_DEPOSIT",
                    amount: securityDepositAmount,
                    balance: adminWallet.securityDepositHeld,
                    balanceBefore: adminSecurityBefore,
                    balanceAfter: adminSecurityAfter,
                    paymentId: payment._id,
                    contractId: payment.contractId,
                    description: `Security deposit held (refundable) for contract ${payment.contractId.contractNumber}`,
                },
            ])

            const contract = payment.contractId
            if (payment.paymentType === "advance") {
                contract.financials.advancePayment.status = "PAID"
                contract.financials.advancePayment.paidAt = new Date()
                contract.financials.advancePayment.paidVia = payment.paymentMethod
                contract.financials.advancePayment.transactionId = payment._id

                contract.financials.securityDeposit.status = "PAID"
                contract.financials.securityDeposit.paidAt = new Date()
                contract.financials.securityDeposit.paidVia = payment.paymentMethod
                contract.financials.securityDeposit.transactionId = payment._id

                contract.status = "ACTIVE"
                contract.vehicleAccess.isActive = true
                contract.activatedAt = new Date()

                const finalDueDate = new Date(contract.rentalPeriod.endDate)
                finalDueDate.setDate(finalDueDate.getDate() - 7)

                const finalSchedule = new PaymentSchedule({
                    contractId: contract._id,
                    corporateOwnerId: contract.corporateOwnerId,
                    fleetOwnerId: contract.fleetOwnerId,
                    currency: contract.financials.currency,
                    scheduleType: "FINAL",
                    amount: contract.financials.finalPayment.amount,
                    dueDate: finalDueDate,
                })
                await finalSchedule.save()

                console.log("[v0] Final payment schedule created automatically")

                contract.financials.finalPayment.dueDate = finalDueDate
                contract.financials.finalPayment.status = "PENDING"

                contract.statusHistory.push({
                    status: "ACTIVE",
                    changedAt: new Date(),
                    changedBy: req.userId,
                    reason: "Payment verified - contract activated after advance + security deposit received",
                })
            } else if (payment.paymentType === "final") {
                contract.financials.finalPayment.status = "PAID"
                contract.financials.finalPayment.paidAt = new Date()
                contract.financials.finalPayment.paidVia = payment.paymentMethod
                contract.financials.finalPayment.transactionId = payment._id


                await PaymentSchedule.updateOne(
                    {
                        contractId: contract._id,
                        scheduleType: "FINAL",
                        status: "PENDING",
                    },
                    {
                        $set: {
                            status: "PAID",
                            paidAt: new Date(),
                            paymentMethod: payment.paymentMethod,
                            transactionId: payment._id,
                        },
                    },
                )
                
                contract.statusHistory.push({
                    status: "ACTIVE",
                    changedAt: new Date(),
                    changedBy: req.userId,
                    reason: "Final payment verified - contract completed",
                })
            }

            contract.markModified("financials")
            await contract.save()

            console.log("[v0] Contract updated to status:", contract.status)
            
            return res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                data: {
                    payment,
                    paymentBreakdown: {
                        advanceAmount,
                        securityDepositAmount,
                        adminCommission: adminCommissionAmount,
                        fleetOwnerAmount,
                    },
                },
            })
        } else if (action === "REJECT") {
            payment.status = "FAILED"
            payment.verificationStatus = "REJECTED"
            payment.verifiedBy = req.userId
            payment.verifiedAt = new Date()
            payment.failureReason = reason || "Payment rejected by admin"

            await payment.save()

            return res.status(200).json({
                success: true,
                message: "Payment rejected",
                data: { payment },
            })
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid action. Must be 'APPROVE' or 'REJECT'",
            })
        }
    } catch (error) {
        console.error("[v0] Verify payment error:", error)
        res.status(500).json({
            success: false,
            message: "Error verifying payment",
            error: error.message,
        })
    }
}

// Get all contracts for admin
export const getAllContracts = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query
        const query = {}

        if (status) {
            query.status = status
        }

        const contracts = await Contract.find(query)
            .populate("corporateOwnerId", "name email phone company")
            .populate("fleetOwnerId", "name email phone company")
            .populate("vehicles.vehicleId")
            .sort({ createdAt: -1 })
            .limit(Number.parseInt(limit))
            .skip((Number.parseInt(page) - 1) * Number.parseInt(limit))

        const total = await Contract.countDocuments(query)

        res.status(200).json({
            success: true,
            contracts,
            pagination: {
                total,
                page: Number.parseInt(page),
                pages: Math.ceil(total / Number.parseInt(limit)),
            },
        })
    } catch (error) {
        console.error("[v0] Error fetching contracts:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching contracts",
            error: error.message,
        })
    }
}

// Get admin dashboard statistics
export const getDashboardStats = async (req, res) => {
    try {
        const [totalContracts, activeContracts, pendingPayments, totalRevenue, adminWallet] = await Promise.all([
            Contract.countDocuments(),
            Contract.countDocuments({ status: "ACTIVE" }),
            Payment.countDocuments({ verificationStatus: "PENDING" }),
            Payment.aggregate([{ $match: { status: "COMPLETED" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            Wallet.findOne({ userId: req.user._id, role: "ADMIN" }),
        ])

        res.status(200).json({
            success: true,
            stats: {
                totalContracts,
                activeContracts,
                pendingPayments,
                totalRevenue: totalRevenue[0]?.total || 0,
                adminBalance: adminWallet?.balance || 0,
            },
        })
    } catch (error) {
        console.error("[v0] Error fetching dashboard stats:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching dashboard statistics",
            error: error.message,
        })
    }
}

