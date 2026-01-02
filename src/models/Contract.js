import mongoose from "mongoose"

const contractSchema = new mongoose.Schema(
    {
        contractNumber: {
            type: String,
            unique: true,
        },
        quotationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quotation",
            required: true,
        },
        corporateOwnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        fleetOwnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        vehicles: [
            {
                vehicleId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Vehicle",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                assignedVehicles: [
                    {
                        vehicleId: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "Vehicle",
                        },
                        driverId: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "User",
                        },
                        assignedDate: Date,
                    },
                ],
            },
        ],
        rentalPeriod: {
            startDate: {
                type: Date,
                required: true,
            },
            endDate: {
                type: Date,
                required: true,
            },
            durationType: {
                type: String,
                enum: ["DAILY", "WEEKLY", "MONTHLY", "LONG_TERM"],
                required: true,
            },
            duration: Number,
        },
        financials: {
            totalAmount: {
                type: Number,
                required: true,
            },
            advancePayment: {
                amount: Number,
                paidAt: Date,
                transactionId: String,
            },
            remainingAmount: Number,
            finalPayment: {
                amount: Number,
                paidAt: Date,
                transactionId: String,
            },
            securityDeposit: {
                amount: Number,
                paidAt: Date,
                refundedAt: Date,
                refundTransactionId: String,
            },
        },
        contractDocument: {
            url: String,
            uploadedAt: Date,
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        },
        digitalSignatures: {
            corporateOwner: {
                signed: {
                    type: Boolean,
                    default: false,
                },
                signedAt: Date,
                signature: String,
                ipAddress: String,
            },
            fleetOwner: {
                signed: {
                    type: Boolean,
                    default: false,
                },
                signedAt: Date,
                signature: String,
                ipAddress: String,
            },
        },
        terms: {
            cancellationPolicy: String,
            lateFees: Number,
            insuranceCoverage: String,
            maintenanceResponsibility: String,
            fuelPolicy: String,
            driverRules: String,
            additionalTerms: String,
        },

        urgencyLevel: {
            type: String,
            enum: ["normal", "urgent", "very-urgent"],
        },
        preferredDeliveryDate: {
            type: Date,
        },

        status: {
            type: String,
            enum: [
                "DRAFT",
                "PENDING_CORPORATE_SIGNATURE",
                "PENDING_FLEET_SIGNATURE",
                "PENDING_PAYMENT",
                "ACTIVE",
                "COMPLETED",
                "CANCELLED",
                "TERMINATED",
            ],
            default: "DRAFT",
        },
        statusHistory: [
            {
                status: String,
                changedAt: {
                    type: Date,
                    default: Date.now,
                },
                changedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                reason: String,
            },
        ],
        notes: [
            {
                message: String,
                createdBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        createdAt: {
            type: Date,
            default: Date.now,
        },
        activatedAt: Date,
        completedAt: Date,
        cancelledAt: Date,
    },
    {
        timestamps: true,
    },
)

// Auto-generate contract number
contractSchema.pre("save", async function (next) {
    if (!this.contractNumber) {
        const count = await mongoose.model("Contract").countDocuments()
        this.contractNumber = `CNT${Date.now()}${String(count + 1).padStart(4, "0")}`
    }
    next()
})

const Contract = mongoose.model("Contract", contractSchema)

export default Contract
