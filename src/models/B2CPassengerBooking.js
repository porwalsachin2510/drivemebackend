import mongoose from "mongoose"

const b2cPassengerBookingSchema = new mongoose.Schema(
    {
        passengerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        b2cPartnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        routeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Route",
            required: false, // For B2C partner routes
        },
        routeListingId: {
            type: String,
            required: false, // For embedded route listings
        },
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true, // The B2C partner who owns the route
        },
        // Booking Details
        pickupLocation: {
            type: String,
            required: true,
        },
        dropoffLocation: {
            type: String,
            required: true,
        },
        travelPath: [
            {
                location: String,
                time: String,
                isFromLocation: Boolean,
                isToLocation: Boolean,
                isStop: Boolean,
            },
        ],
        bookingDate: {
            type: Date,
            required: true, // Date when booking was made
        },
        travelDate: {
            type: Date,
            required: true, // Date of actual travel
        },
        numberOfSeats: {
            type: Number,
            default: 1,
            min: 1,
        },
        // Payment Details
        paymentAmount: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ["STRIPE", "TAP", "CASH"],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
            default: "PENDING",
        },
        transactionId: {
            type: String,
            sparse: true,
        },
        // Status
        bookingStatus: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"],
            default: "PENDING",
        },
        // Driver/Vehicle Info
        vehicleModel: String,
        vehiclePlate: String,
        driverName: String,
        driverImage: String,
        driverPhoneNumber: String,
        driverRating: Number,
        // Admin Commission (20% from payment)
        adminCommissionAmount: {
            type: Number,
            default: 0,
        },
        driverEarnings: {
            type: Number,
            default: 0,
        },
        // Additional Info
        passengerNotes: String,
        rejectionReason: String,
        cancelledAt: Date,
        cancelledBy: String, // "PASSENGER", "DRIVER", "ADMIN"
        completedAt: Date,
        rating: Number, // Passenger rating for this ride
        review: String,
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
)

b2cPassengerBookingSchema.index({ passengerId: 1, travelDate: 1 })
b2cPassengerBookingSchema.index({ b2cPartnerId: 1, bookingStatus: 1 })
b2cPassengerBookingSchema.index({ partnerId: 1, bookingStatus: 1 })
b2cPassengerBookingSchema.index({ travelDate: 1 })

export default mongoose.model("B2CPassengerBooking", b2cPassengerBookingSchema)
