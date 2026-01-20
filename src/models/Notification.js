import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        type: {
            type: String,
            enum: [
                // Existing types
                "QUOTATION_REQUEST",
                "QUOTATION_RESPONSE",
                "NEGOTIATION",
                "CONTRACT_PENDING",
                "PAYMENT_RECEIVED",
                "BOOKING_CONFIRMED",
                "MAINTENANCE_DUE",
                "DOCUMENT_EXPIRY",
                "SYSTEM_NOTIFICATION",
                "NEW_BOOKING",
                "BOOKING_ACCEPTED",
                "BOOKING_REJECTED",
                "BOOKING_CANCELLED",
                "RIDE_COMPLETED",
                "CORPORATE_BOOKING",
                "PAYMENT_PENDING",
                "PAYMENT_COMPLETED",
                "PAYMENT_FAILED",
                "REFUND_PROCESSED",
                "DRIVER_ASSIGNED",
                "DRIVER_ARRIVING",
                "RIDE_STARTED",
                "REVIEW_REQUEST",
            ],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        relatedEntityId: mongoose.Schema.Types.ObjectId,
        relatedEntityType: {
            type: String,
            enum: ["QUOTATION", "CONTRACT", "BOOKING", "PAYMENT", "VEHICLE", "B2C_BOOKING", "CORPORATE_BOOKING", "RIDE"],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: Date,
        status: {
            type: String,
            enum: ["UNREAD", "READ", "ARCHIVED"],
            default: "UNREAD",
        },
    },
    {
        timestamps: true,
    },
)

notificationSchema.pre("save", function (next) {
    if (this.recipientId && !this.userId) {
        this.userId = this.recipientId
    }
    if (this.userId && !this.recipientId) {
        this.recipientId = this.userId
    }
    next()
})

notificationSchema.index({ userId: 1, isRead: 1 })
notificationSchema.index({ recipientId: 1, status: 1 })
notificationSchema.index({ createdAt: -1 })
notificationSchema.index({ type: 1 })

const Notification = mongoose.model("Notification", notificationSchema)

export default Notification
