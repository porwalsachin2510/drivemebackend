import Contract from "../models/Contract.js"
import Quotation from "../models/Quotation.js"
import { uploadToCloudinary } from "../Config/Cloudinary.js"

// @desc    Create contract request from accepted quotation
// @route   POST /api/contracts/create-from-quotation
// @access  Private (CORPORATE only)
export const createContractFromQuotation = async (req, res) => {


    try {

        console.log("createContractFromQuotation", req.body);
        
        const corporateOwnerId = req.userId

        const { quotationId, notes, urgencyLevel, preferredDeliveryDate } = req.body

        // Find the accepted quotation
        const quotation = await Quotation.findOne({
            _id: quotationId,
            corporateOwnerId,
            status: "ACCEPTED",
        })
            .populate("fleetOwnerId")
            .populate("vehicles.vehicleId")

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Accepted quotation not found",
            })
        }

        // Check if contract already exists
        const existingContract = await Contract.findOne({ quotationId })
        if (existingContract) {
            return res.status(400).json({
                success: false,
                message: "Contract already exists for this quotation",
                data: { contract: existingContract },
            })
        }

        // Prepare notes array if notes is provided
        const notesArray = notes ? [{
            message: notes,
            createdBy: corporateOwnerId,
            createdAt: new Date(),
        }] : []

        // Create new contract
        const contract = new Contract({
            quotationId: quotation._id,
            corporateOwnerId: quotation.corporateOwnerId,
            fleetOwnerId: quotation.fleetOwnerId,
            vehicles: quotation.vehicles.map((v) => ({
                vehicleId: v.vehicleId._id,
                quantity: v.quantity,
                assignedVehicles: [],
            })),
            rentalPeriod: quotation.rentalPeriod,
            financials: {
                totalAmount: quotation.quotedPrice.totalAmount,
                advancePayment: {
                    amount: quotation.quotedPrice.totalAmount * 0.5,
                },
                remainingAmount: quotation.quotedPrice.totalAmount * 0.5,
                securityDeposit: {
                    amount: quotation.quotedPrice.totalAmount * 0.1,
                },
            },
            notes: notesArray, // Array of note objects
            // If you need urgencyLevel and preferredDeliveryDate, add them to your schema
            status: "DRAFT",
            statusHistory: [
                {
                    status: "DRAFT",
                    changedAt: new Date(),
                    changedBy: corporateOwnerId,
                    reason: "Contract created from accepted quotation",
                },
            ],
        })

        await contract.save()
        await contract.populate([
            {
                path: "corporateOwnerId",
                select: "fullName email companyName",
            },
            {
                path: "fleetOwnerId",
                select: "fullName email companyName",
            },
            {
                path: "vehicles.vehicleId",
                select: "vehicleName vehicleCategory registrationNumber",
            },
        ])

        res.status(201).json({
            success: true,
            message: "Contract created successfully",
            data: { contract },
        })
    } catch (error) {
        console.error("Error creating contract:", error)
        res.status(500).json({
            success: false,
            message: "Failed to create contract",
            error: error.message,
        })
    }
}

// @desc    Get all contracts for corporate owner
// @route   GET /api/contracts/corporate/all
// @access  Private (CORPORATE only)
export const getCorporateContracts = async (req, res) => {
    try {
        const corporateOwnerId = req.userId

        const contracts = await Contract.find({ corporateOwnerId })
            .populate({
                path: "quotationId",
                select: "quotationNumber requirements",
            })
            .populate({
                path: "fleetOwnerId",
                select: "fullName email companyName",
            })
            .populate({
                path: "vehicles.vehicleId",
                select: "vehicleName vehicleCategory registrationNumber",
            })
            .sort({ createdAt: -1 })

        const stats = {
            total: contracts.length,
            draft: contracts.filter((c) => c.status === "DRAFT").length,
            pendingSignature: contracts.filter((c) => c.status.includes("PENDING") && c.status.includes("SIGNATURE")).length,
            active: contracts.filter((c) => c.status === "ACTIVE").length,
            completed: contracts.filter((c) => c.status === "COMPLETED").length,
        }

        res.status(200).json({
            success: true,
            data: { contracts, stats },
        })
    } catch (error) {
        console.error("Error fetching corporate contracts:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch contracts",
            error: error.message,
        })
    }
}

// @desc    Get contract by ID
// @route   GET /api/contracts/:contractId
// @access  Private (CORPORATE or B2B_PARTNER)
export const getContractById = async (req, res) => {
    try {
        const { contractId } = req.params
        const userId = req.userId

        const contract = await Contract.findById(contractId)
            .populate({
                path: "quotationId",
                select: "quotationNumber requirements quotedPrice",
            })
            .populate({
                path: "corporateOwnerId",
                select: "fullName email companyName whatsappNumber",
            })
            .populate({
                path: "fleetOwnerId",
                select: "fullName email companyName whatsappNumber",
            })
            .populate({
                path: "vehicles.vehicleId",
                select: "vehicleName vehicleCategory registrationNumber photos",
            })

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Contract not found",
            })
        }

        // Check if user has access to this contract
        if (contract.corporateOwnerId._id.toString() !== userId && contract.fleetOwnerId._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            })
        }

        res.status(200).json({
            success: true,
            data: { contract },
        })
    } catch (error) {
        console.error("Error fetching contract:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch contract",
            error: error.message,
        })
    }
}

// @desc    Fleet owner uploads contract document
// @route   POST /api/contracts/:contractId/upload-document
// @access  Private (B2B_PARTNER only)
export const uploadContractDocument = async (req, res) => {
    try {
        const { contractId } = req.params
        const fleetOwnerId = req.userId

        console.log("[v0] Upload contract document request received")
        console.log("[v0] Contract ID:", contractId)
        console.log("[v0] Fleet Owner ID:", fleetOwnerId)
        console.log("[v0] File received:", req.file ? req.file.originalname : "No file")

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No document file provided. Please upload a PDF file.",
            })
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({
                success: false,
                message: "Only PDF files are allowed for contract documents.",
            })
        }

        const contract = await Contract.findOne({
            _id: contractId,
            fleetOwnerId,
        })

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Contract not found or you don't have access to this contract",
            })
        }

        console.log("[v0] Uploading PDF to Cloudinary...")
        const uploadResult = await uploadToCloudinary(req.file, "driveme/contracts")

        console.log("[v0] Cloudinary upload successful:", uploadResult.secure_url)

        contract.contractDocument = {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            uploadedAt: new Date(),
            uploadedBy: fleetOwnerId,
            fileName: req.file.originalname,
            fileSize: req.file.size,
        }
        contract.status = "PENDING_CORPORATE_SIGNATURE"
        contract.statusHistory.push({
            status: "PENDING_CORPORATE_SIGNATURE",
            changedBy: fleetOwnerId,
            reason: "Contract document uploaded",
        })

        await contract.save()

        await contract.populate([
            {
                path: "corporateOwnerId",
                select: "fullName email companyName",
            },
            {
                path: "fleetOwnerId",
                select: "fullName email companyName",
            },
        ])

        res.status(200).json({
            success: true,
            message: "Contract document uploaded successfully",
            data: { contract },
        })
    } catch (error) {
        console.error("[v0] Error uploading contract document:", error)
        res.status(500).json({
            success: false,
            message: "Failed to upload contract document",
            error: error.message,
        })
    }
}

// @desc    Sign contract digitally
// @route   POST /api/contracts/:contractId/sign
// @access  Private (CORPORATE or B2B_PARTNER)
// export const signContract = async (req, res) => {
//     try {
//         const { contractId } = req.params
//         const userId = req.userId
//         const userRole = req.userRole
//         const { signature, ipAddress } = req.body

//         console.log(contractId, userId, userRole, signature, ipAddress);
        
//         const contract = await Contract.findById(contractId).populate({
//             path: "quotationId",
//             select: "quotationNumber requirements quotedPrice",
//         })
//             .populate({
//                 path: "corporateOwnerId",
//                 select: "fullName email companyName whatsappNumber",
//             })
//             .populate({
//                 path: "fleetOwnerId",
//                 select: "fullName email companyName whatsappNumber",
//             })
//             .populate({
//                 path: "vehicles.vehicleId",
//                 select: "vehicleName vehicleCategory registrationNumber photos",
//             })
        
//         console.log("contract", contract);

//         if (!contract) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Contract not found",
//             })
//         }

//         // Corporate owner signs first
//         if (userRole === "CORPORATE" && contract.corporateOwnerId.toString() === userId) {
//             if (contract.digitalSignatures.corporateOwner.signed) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "You have already signed this contract",
//                 })
//             }

//             contract.digitalSignatures.corporateOwner = {
//                 signed: true,
//                 signedAt: new Date(),
//                 signature,
//                 ipAddress,
//             }
//             contract.status = "PENDING_FLEET_SIGNATURE"
//             contract.statusHistory.push({
//                 status: "PENDING_FLEET_SIGNATURE",
//                 changedBy: userId,
//                 reason: "Corporate owner signed the contract",
//             })
//         }

//         // Fleet owner signs second
//         if (userRole === "B2B_PARTNER" && contract.fleetOwnerId.toString() === userId) {
//             if (!contract.digitalSignatures.corporateOwner.signed) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Corporate owner must sign first",
//                 })
//             }

//             if (contract.digitalSignatures.fleetOwner.signed) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "You have already signed this contract",
//                 })
//             }

//             contract.digitalSignatures.fleetOwner = {
//                 signed: true,
//                 signedAt: new Date(),
//                 signature,
//                 ipAddress,
//             }
//             contract.status = "PENDING_PAYMENT"
//             contract.statusHistory.push({
//                 status: "PENDING_PAYMENT",
//                 changedBy: userId,
//                 reason: "Fleet owner signed the contract",
//             })
//         }

//         await contract.save()

//         res.status(200).json({
//             success: true,
//             message: "Contract signed successfully",
//             data: { contract },
//         })
//     } catch (error) {
//         console.error("Error signing contract:", error)
//         res.status(500).json({
//             success: false,
//             message: "Failed to sign contract",
//             error: error.message,
//         })
//     }
// }

export const signContract = async (req, res) => {
    try {
        const { contractId } = req.params
        const userId = req.userId
        const userRole = req.userRole
        const { signature, ipAddress } = req.body

        const contract = await Contract.findById(contractId)
            .populate("quotationId", "quotationNumber requirements quotedPrice")
            .populate("corporateOwnerId", "fullName email companyName whatsappNumber")
            .populate("fleetOwnerId", "fullName email companyName whatsappNumber")
            .populate("vehicles.vehicleId", "vehicleName vehicleCategory registrationNumber photos")

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Contract not found",
            })
        }

        // ✅ Ensure structure exists
        if (!contract.digitalSignatures) {
            contract.digitalSignatures = {
                corporateOwner: {},
                fleetOwner: {},
            }
        }

        /* ================= CORPORATE SIGN ================= */
        if (
            userRole === "CORPORATE" &&
            contract.corporateOwnerId._id.toString() === userId
        ) {
            if (contract.digitalSignatures.corporateOwner?.signed) {
                return res.status(400).json({
                    success: false,
                    message: "You have already signed this contract",
                })
            }

            contract.digitalSignatures.corporateOwner = {
                signed: true,
                signedAt: new Date(),
                signature,
                ipAddress,
            }

            contract.status = "PENDING_FLEET_SIGNATURE"

            contract.statusHistory.push({
                status: "PENDING_FLEET_SIGNATURE",
                changedBy: userId,
                reason: "Corporate owner signed the contract",
            })
        }

        /* ================= FLEET SIGN ================= */
        else if (
            userRole === "B2B_PARTNER" &&
            contract.fleetOwnerId._id.toString() === userId
        ) {
            if (!contract.digitalSignatures.corporateOwner?.signed) {
                return res.status(400).json({
                    success: false,
                    message: "Corporate owner must sign first",
                })
            }

            if (contract.digitalSignatures.fleetOwner?.signed) {
                return res.status(400).json({
                    success: false,
                    message: "You have already signed this contract",
                })
            }

            contract.digitalSignatures.fleetOwner = {
                signed: true,
                signedAt: new Date(),
                signature,
                ipAddress,
            }

            contract.status = "PENDING_PAYMENT"

            contract.statusHistory.push({
                status: "PENDING_PAYMENT",
                changedBy: userId,
                reason: "Fleet owner signed the contract",
            })
        } else {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to sign this contract",
            })
        }

        // ✅ FORCE mongoose to track nested change
        contract.markModified("digitalSignatures")
        contract.markModified("statusHistory")

        await contract.save()

        return res.status(200).json({
            success: true,
            message: "Contract signed successfully",
            data: contract,
        })
    } catch (error) {
        console.error("Error signing contract:", error)
        return res.status(500).json({
            success: false,
            message: "Failed to sign contract",
            error: error.message,
        })
    }
}


// @desc    Process payment for contract
// @route   POST /api/contracts/:contractId/payment
// @access  Private (CORPORATE only)
export const processContractPayment = async (req, res) => {
    try {
        const { contractId } = req.params
        const corporateOwnerId = req.userId
        const { paymentType, amount, transactionId } = req.body // paymentType: 'advance' or 'final'

        const contract = await Contract.findOne({
            _id: contractId,
            corporateOwnerId,
        })

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Contract not found",
            })
        }

        if (paymentType === "advance") {
            contract.financials.advancePayment.paidAt = new Date()
            contract.financials.advancePayment.transactionId = transactionId
            contract.status = "ACTIVE"
            contract.activatedAt = new Date()
            contract.statusHistory.push({
                status: "ACTIVE",
                changedBy: corporateOwnerId,
                reason: "Advance payment completed",
            })
        } else if (paymentType === "final") {
            contract.financials.finalPayment = {
                amount,
                paidAt: new Date(),
                transactionId,
            }
            contract.status = "COMPLETED"
            contract.completedAt = new Date()
            contract.statusHistory.push({
                status: "COMPLETED",
                changedBy: corporateOwnerId,
                reason: "Final payment completed",
            })
        }

        await contract.save()

        res.status(200).json({
            success: true,
            message: "Payment processed successfully",
            data: { contract },
        })
    } catch (error) {
        console.error("Error processing payment:", error)
        res.status(500).json({
            success: false,
            message: "Failed to process payment",
            error: error.message,
        })
    }
}

// @desc    Get all contracts for fleet owner
// @route   GET /api/contracts/fleet/all
// @access  Private (B2B_PARTNER only)
export const getFleetOwnerContracts = async (req, res) => {
    try {
        const fleetOwnerId = req.userId

        const contracts = await Contract.find({ fleetOwnerId })
            .populate({
                path: "quotationId",
                select: "quotationNumber requirements",
            })
            .populate({
                path: "corporateOwnerId",
                select: "fullName email companyName",
            })
            .populate({
                path: "vehicles.vehicleId",
                select: "vehicleName vehicleCategory registrationNumber",
            })
            .sort({ createdAt: -1 })

        const stats = {
            total: contracts.length,
            draft: contracts.filter((c) => c.status === "DRAFT").length,
            pendingDocument: contracts.filter((c) => c.status === "DRAFT" && !c.contractDocument?.url).length,
            pendingSignature: contracts.filter((c) => c.status.includes("PENDING") && c.status.includes("SIGNATURE")).length,
            active: contracts.filter((c) => c.status === "ACTIVE").length,
            completed: contracts.filter((c) => c.status === "COMPLETED").length,
        }

        res.status(200).json({
            success: true,
            data: { contracts, stats },
        })
    } catch (error) {
        console.error("Error fetching fleet owner contracts:", error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch contracts",
            error: error.message,
        })
    }
}

// @desc    Fleet owner approves the signed contract
// @route   POST /api/contracts/:contractId/approve
// @access  Private (B2B_PARTNER only)
export const approveContract = async (req, res) => {
    try {
        const { contractId } = req.params
        const fleetOwnerId = req.userId
        const { approvalNotes } = req.body

        const contract = await Contract.findOne({
            _id: contractId,
            fleetOwnerId,
        })

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Contract not found",
            })
        }

        // Check if both parties have signed
        if (!contract.digitalSignatures.corporateOwner.signed || !contract.digitalSignatures.fleetOwner.signed) {
            return res.status(400).json({
                success: false,
                message: "Both parties must sign the contract before approval",
            })
        }

        // Check if already approved
        if (contract.status === "ACTIVE" || contract.status === "COMPLETED") {
            return res.status(400).json({
                success: false,
                message: "Contract is already approved",
            })
        }

        contract.status = "APPROVED_PENDING_PAYMENT"
        contract.approvedAt = new Date()
        contract.approvedBy = fleetOwnerId
        contract.statusHistory.push({
            status: "APPROVED_PENDING_PAYMENT",
            changedBy: fleetOwnerId,
            reason: approvalNotes || "Fleet owner approved the signed contract",
        })

        await contract.save()

        await contract.populate([
            {
                path: "corporateOwnerId",
                select: "fullName email companyName",
            },
            {
                path: "fleetOwnerId",
                select: "fullName email companyName",
            },
            {
                path: "vehicles.vehicleId",
                select: "vehicleName vehicleCategory registrationNumber",
            },
        ])

        res.status(200).json({
            success: true,
            message: "Contract approved successfully. Awaiting payment from corporate owner.",
            data: { contract },
        })
    } catch (error) {
        console.error("Error approving contract:", error)
        res.status(500).json({
            success: false,
            message: "Failed to approve contract",
            error: error.message,
        })
    }
}

