import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "QUOTATION_REQUEST",
                "QUOTATION_RESPONSE",
                "NEGOTIATION",
                "CONTRACT_PENDING",
                "PAYMENT_RECEIVED",
                "BOOKING_CONFIRMED",
                "MAINTENANCE_DUE",
                "DOCUMENT_EXPIRY",
                "SYSTEM_NOTIFICATION",
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
        relatedEntityId: mongoose.Schema.Types.ObjectId,
        relatedEntityType: {
            type: String,
            enum: ["QUOTATION", "CONTRACT", "BOOKING", "PAYMENT", "VEHICLE"],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: Date,
    },
    {
        timestamps: true,
    },
)

const Notification = mongoose.model("Notification", notificationSchema)

export default Notification
