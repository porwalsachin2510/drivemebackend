import express from "express"
import { verifyToken } from "../middleware/auth.js"
import {
    checkRouteAvailability,
    createB2CBooking,
    createCorporateBooking,
    acceptB2CBooking,
    rejectB2CBooking,
    completeB2CBooking,
    getPassengerBookings,
    getPartnerBookings,
    getCorporateOwnerBookings,
    verifyBookingPayment,
    handleTapWebhook,
    handleStripeWebhook,
    getAvailableSeats,
} from "../controllers/bookingController.js"

const router = express.Router()

// Public routes (webhooks)
router.post("/tap-webhook", handleTapWebhook)
router.post("/stripe-webhook", express.raw({ type: "application/json" }), handleStripeWebhook)

// Protected routes
router.post("/check-availability", verifyToken, checkRouteAvailability)
router.get("/available-seats", verifyToken, getAvailableSeats)

// Passenger booking routes
router.post("/b2c", verifyToken, createB2CBooking)
router.post("/corporate", verifyToken, createCorporateBooking)
router.get("/passenger", verifyToken, getPassengerBookings)
router.post("/verify-payment", verifyToken, verifyBookingPayment)

// Partner routes
router.get("/partner", verifyToken, getPartnerBookings)
router.put("/:bookingId/accept", verifyToken, acceptB2CBooking)
router.put("/:bookingId/reject", verifyToken, rejectB2CBooking)
router.put("/:bookingId/complete", verifyToken, completeB2CBooking)

// Corporate owner routes
router.get("/corporate-owner", verifyToken, getCorporateOwnerBookings)

export default router
