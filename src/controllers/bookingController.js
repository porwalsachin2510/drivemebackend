// import B2CPassengerBooking from "../models/B2CPassengerBooking.js"
// import CorporateBooking from "../models/CorporateBooking.js"
// import User from "../models/User.js"
// import Route from "../models/Route.js"
// import Wallet from "../models/Wallet.js"
// import Notification from "../models/Notification.js"
// import stripe from "../Config/stripe.js"
// import tapPayments from "../Config/tapPayments.js"
// import { calculateCommission, ADMIN_COMMISSION_PERCENTAGE } from "../Services/HelperUtilities.js"

// // Check if route is available for booking
// export const checkRouteAvailability = async (req, res) => {
//     try {
//         const { routeId, travelDate } = req.body
//         const today = new Date()
//         today.setHours(0, 0, 0, 0)

//         const travelDateObj = new Date(travelDate)
//         travelDateObj.setHours(0, 0, 0, 0)

//         if (travelDateObj < today) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Cannot book for past dates",
//                 isAvailable: false,
//             })
//         }

//         const route = await Route.findById(routeId)
//         if (!route) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Route not found",
//                 isAvailable: false,
//             })
//         }

//         const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
//         const dayOfWeek = daysOfWeek[travelDateObj.getDay()]

//         const routeStartDate = new Date(route.startDate)
//         routeStartDate.setHours(0, 0, 0, 0)

//         if (travelDateObj < routeStartDate) {
//             return res.status(200).json({
//                 success: true,
//                 isAvailable: false,
//                 reason: "Route has not started yet",
//                 dayOfWeek,
//                 startDate: route.startDate,
//             })
//         }

//         const isAvailableDay = route.availableDays && route.availableDays.includes(dayOfWeek)

//         if (!isAvailableDay) {
//             return res.status(200).json({
//                 success: true,
//                 isAvailable: false,
//                 reason: "Route not available on this day",
//                 dayOfWeek,
//                 availableDays: route.availableDays,
//             })
//         }

//         const b2cBookedSeats = await B2CPassengerBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: {
//                         $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                         $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                     },
//                     bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSeats: { $sum: "$numberOfSeats" },
//                 },
//             },
//         ])

//         const corporateBookedSeats = await CorporateBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: {
//                         $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                         $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                     },
//                     bookingStatus: { $in: ["CONFIRMED"] },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSeats: { $sum: "$numberOfSeats" },
//                 },
//             },
//         ])

//         const totalBookedSeats = (b2cBookedSeats[0]?.totalSeats || 0) + (corporateBookedSeats[0]?.totalSeats || 0)
//         const availableSeats = (route.totalSeats || route.availableSeats || 0) - totalBookedSeats

//         return res.status(200).json({
//             success: true,
//             isAvailable: availableSeats > 0,
//             dayOfWeek,
//             availableSeats: Math.max(0, availableSeats),
//             totalSeats: route.totalSeats || route.availableSeats || 0,
//             bookedSeats: totalBookedSeats,
//             message: availableSeats > 0 ? "Route is available for booking" : "No seats available",
//         })
//     } catch (error) {
//         console.error("Error checking route availability:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error while checking availability",
//         })
//     }
// }

// // Create B2C Passenger Booking
// export const createB2CBooking = async (req, res) => {
//     try {
//         const passengerId = req.userId
//         const {
//             routeId,
//             partnerId,
//             pickupLocation,
//             dropoffLocation,
//             travelDate,
//             numberOfSeats = 1,
//             paymentMethod,
//             paymentAmount,
//             travelPath,
//             vehicleModel,
//             vehiclePlate,
//             driverName,
//             driverImage,
//             passengerNotes,
//         } = req.body

//         if (!partnerId || !pickupLocation || !dropoffLocation || !travelDate) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields",
//             })
//         }

//         const passenger = await User.findById(passengerId)
//         const partner = await User.findById(partnerId)

//         if (!passenger || !partner) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Passenger or Partner not found",
//             })
//         }

//         if (routeId) {
//             const route = await Route.findById(routeId)
//             if (route) {
//                 const bookedSeatsResult = await B2CPassengerBooking.aggregate([
//                     {
//                         $match: {
//                             routeId: route._id,
//                             travelDate: {
//                                 $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                                 $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                             },
//                             bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
//                         },
//                     },
//                     {
//                         $group: {
//                             _id: null,
//                             totalSeats: { $sum: "$numberOfSeats" },
//                         },
//                     },
//                 ])

//                 const bookedSeats = bookedSeatsResult[0]?.totalSeats || 0
//                 const availableSeats = (route.totalSeats || route.availableSeats || 0) - bookedSeats

//                 if (numberOfSeats > availableSeats) {
//                     return res.status(400).json({
//                         success: false,
//                         message: `Only ${availableSeats} seat(s) available. You requested ${numberOfSeats}.`,
//                     })
//                 }
//             }
//         }

//         const commissionData = calculateCommission(paymentAmount)

//         const booking = new B2CPassengerBooking({
//             passengerId,
//             b2cPartnerId: partnerId,
//             partnerId,
//             routeId: routeId || null,
//             pickupLocation,
//             dropoffLocation,
//             travelPath,
//             bookingDate: new Date(),
//             travelDate,
//             numberOfSeats,
//             paymentAmount,
//             paymentMethod,
//             bookingStatus: "PENDING",
//             vehicleModel,
//             vehiclePlate,
//             driverName,
//             driverImage,
//             passengerNotes,
//             adminCommissionAmount: paymentMethod === "CASH" ? 0 : commissionData.adminCommission,
//             driverEarnings: paymentMethod === "CASH" ? paymentAmount : commissionData.fleetOwnerAmount,
//         })

//         await booking.save()

//         if (paymentMethod === "STRIPE") {
//             const session = await stripe.checkout.sessions.create({
//                 payment_method_types: ["card"],
//                 mode: "payment",
//                 line_items: [
//                     {
//                         price_data: {
//                             currency: "aed",
//                             product_data: {
//                                 name: "DriveMe Booking",
//                                 description: `Booking from ${pickupLocation} to ${dropoffLocation}`,
//                             },
//                             unit_amount: Math.round(paymentAmount * 100),
//                         },
//                         quantity: 1,
//                     },
//                 ],
//                 success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
//                 cancel_url: `${process.env.FRONTEND_URL}/booking/cancelled?booking_id=${booking._id}`,
//                 customer_email: passenger.email,
//                 metadata: {
//                     bookingId: booking._id.toString(),
//                     type: "B2C_BOOKING",
//                     passengerId: passengerId.toString(),
//                     partnerId: partnerId.toString(),
//                 },
//             })

//             booking.transactionId = session.id
//             booking.paymentStatus = "PENDING"
//             await booking.save()

//             return res.status(201).json({
//                 success: true,
//                 booking,
//                 paymentData: {
//                     provider: "STRIPE",
//                     paymentUrl: session.url,
//                     sessionId: session.id,
//                 },
//                 message: "Booking created. Complete payment to confirm.",
//             })
//         } else if (paymentMethod === "TAP") {
//             const chargeData = await tapPayments.createCharge({
//                 amount: paymentAmount,
//                 currency: "AED",
//                 customer: {
//                     firstName: passenger.fullName?.split(" ")[0] || "Customer",
//                     lastName: passenger.fullName?.split(" ").slice(1).join(" ") || "",
//                     email: passenger.email,
//                     countryCode: "971",
//                     phone: passenger.whatsappNumber || passenger.phone || "",
//                 },
//                 redirectUrl: `${process.env.FRONTEND_URL}/booking/success?booking_id=${booking._id}`,
//                 webhookUrl: `${process.env.BACKEND_URL}/api/bookings/tap-webhook`,
//                 metadata: {
//                     bookingId: booking._id.toString(),
//                     type: "B2C_BOOKING",
//                 },
//                 description: `DriveMe Booking: ${pickupLocation} to ${dropoffLocation}`,
//             })

//             booking.transactionId = chargeData.id
//             booking.paymentStatus = "PENDING"
//             await booking.save()

//             return res.status(201).json({
//                 success: true,
//                 booking,
//                 paymentData: {
//                     provider: "TAP",
//                     paymentUrl: chargeData.transaction?.url || chargeData.redirect?.url,
//                     chargeId: chargeData.id,
//                 },
//                 message: "Booking created. Complete payment to confirm.",
//             })
//         } else {
//             // CASH payment
//             await Notification.create({
//                 recipientId: partnerId,
//                 type: "NEW_BOOKING",
//                 title: "New Booking Request (Cash Payment)",
//                 message: `New booking from ${passenger.fullName} - Amount: AED ${paymentAmount}`,
//                 data: {
//                     bookingId: booking._id,
//                     passengerId,
//                     pickupLocation,
//                     dropoffLocation,
//                     travelDate,
//                     paymentAmount,
//                     paymentMethod: "CASH",
//                 },
//                 status: "UNREAD",
//             })

//             return res.status(201).json({
//                 success: true,
//                 booking,
//                 message: "Booking created successfully. Partner will review your request.",
//             })
//         }
//     } catch (error) {
//         console.error("Error creating B2C booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: error.message || "Server error while creating booking",
//         })
//     }
// }

// // Create Corporate Booking
// export const createCorporateBooking = async (req, res) => {
//     try {
//         const passengerId = req.userId
//         const {
//             routeId,
//             contractId,
//             corporateOwnerId,
//             pickupLocation,
//             dropoffLocation,
//             travelDate,
//             numberOfSeats = 1,
//             travelPath,
//             vehicleModel,
//             vehiclePlate,
//             driverName,
//             driverImage,
//             passengerNotes,
//         } = req.body

//         if (!routeId || !corporateOwnerId || !travelDate) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields",
//             })
//         }

//         const passenger = await User.findById(passengerId)
//         if (!passenger) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Passenger not found",
//             })
//         }

//         if (!passenger.companyId || passenger.companyId.toString() !== corporateOwnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized: Employee does not belong to this company",
//             })
//         }

//         const route = await Route.findById(routeId)
//         if (!route) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Route not found",
//             })
//         }

//         const corporateBookedSeatsResult = await CorporateBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: {
//                         $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                         $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                     },
//                     bookingStatus: "CONFIRMED",
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSeats: { $sum: "$numberOfSeats" },
//                 },
//             },
//         ])

//         const bookedSeats = corporateBookedSeatsResult[0]?.totalSeats || 0
//         const availableSeats = (route.totalSeats || route.availableSeats || 0) - bookedSeats

//         if (numberOfSeats > availableSeats) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Only ${availableSeats} seat(s) available. You requested ${numberOfSeats}.`,
//             })
//         }

//         const booking = new CorporateBooking({
//             passengerId,
//             corporateOwnerId,
//             routeId,
//             contractId: contractId || null,
//             pickupLocation,
//             dropoffLocation,
//             travelPath,
//             bookingDate: new Date(),
//             travelDate,
//             numberOfSeats,
//             bookingStatus: "CONFIRMED",
//             vehicleModel,
//             vehiclePlate,
//             driverName,
//             driverImage,
//             passengerNotes,
//         })

//         await booking.save()

//         // Send notification to corporate owner
//         const corporateOwner = await User.findById(corporateOwnerId)
//         await Notification.create({
//             recipientId: corporateOwnerId,
//             userId: corporateOwnerId,
//             type: "CORPORATE_BOOKING",
//             title: "Employee Booking Confirmed",
//             message: `${passenger.fullName} has booked ${numberOfSeats} seat(s) for ${new Date(travelDate).toLocaleDateString()}`,
//             data: {
//                 bookingId: booking._id,
//                 passengerId,
//                 employeeName: passenger.fullName,
//                 pickupLocation,
//                 dropoffLocation,
//                 travelDate,
//                 numberOfSeats,
//             },
//             status: "UNREAD",
//         })

//         // Send confirmation to passenger
//         await Notification.create({
//             recipientId: passengerId,
//             userId: passengerId,
//             type: "BOOKING_CONFIRMED",
//             title: "Booking Confirmed",
//             message: `Your booking for ${new Date(travelDate).toLocaleDateString()} has been confirmed`,
//             data: {
//                 bookingId: booking._id,
//                 pickupLocation,
//                 dropoffLocation,
//                 travelDate,
//                 companyName: corporateOwner?.companyName || "Your Company",
//             },
//             status: "UNREAD",
//         })

//         return res.status(201).json({
//             success: true,
//             booking,
//             message: "Booking confirmed successfully",
//         })
//     } catch (error) {
//         console.error("Error creating corporate booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: error.message || "Server error while creating corporate booking",
//         })
//     }
// }

// // Partner: Accept Booking
// export const acceptB2CBooking = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { bookingId } = req.params

//         const booking = await B2CPassengerBooking.findById(bookingId)

//         if (!booking) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Booking not found",
//             })
//         }

//         if (booking.b2cPartnerId.toString() !== partnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized: This booking does not belong to you",
//             })
//         }

//         booking.bookingStatus = "CONFIRMED"
//         await booking.save()

//         const passenger = await User.findById(booking.passengerId)
//         await Notification.create({
//             recipientId: booking.passengerId,
//             type: "BOOKING_ACCEPTED",
//             title: "Booking Accepted",
//             message: `Your booking has been accepted. Get ready for your ride!`,
//             data: {
//                 bookingId: booking._id,
//                 pickupLocation: booking.pickupLocation,
//                 dropoffLocation: booking.dropoffLocation,
//                 travelDate: booking.travelDate,
//             },
//             status: "UNREAD",
//         })

//         return res.status(200).json({
//             success: true,
//             booking,
//             message: "Booking accepted successfully",
//         })
//     } catch (error) {
//         console.error("Error accepting booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Partner: Reject Booking
// export const rejectB2CBooking = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { bookingId } = req.params
//         const { rejectionReason } = req.body

//         const booking = await B2CPassengerBooking.findById(bookingId)

//         if (!booking) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Booking not found",
//             })
//         }

//         if (booking.b2cPartnerId.toString() !== partnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized",
//             })
//         }

//         booking.bookingStatus = "REJECTED"
//         booking.rejectionReason = rejectionReason || "No reason provided"

//         if (booking.paymentStatus === "COMPLETED" && booking.transactionId) {
//             try {
//                 if (booking.paymentMethod === "STRIPE") {
//                     // Create refund via Stripe
//                     const refund = await stripe.refunds.create({
//                         payment_intent: booking.transactionId,
//                         reason: "requested_by_customer",
//                     })
//                     booking.paymentStatus = "REFUNDED"
//                     booking.refundId = refund.id
//                 } else if (booking.paymentMethod === "TAP") {
//                     // TAP refund would need to be implemented
//                     booking.paymentStatus = "REFUND_PENDING"
//                 }
//             } catch (refundError) {
//                 console.error("Refund error:", refundError)
//                 booking.paymentStatus = "REFUND_FAILED"
//             }
//         }

//         await booking.save()

//         await Notification.create({
//             recipientId: booking.passengerId,
//             type: "BOOKING_REJECTED",
//             title: "Booking Rejected",
//             message: `Your booking has been rejected. Reason: ${booking.rejectionReason}`,
//             data: {
//                 bookingId: booking._id,
//                 rejectionReason: booking.rejectionReason,
//             },
//             status: "UNREAD",
//         })

//         return res.status(200).json({
//             success: true,
//             booking,
//             message: "Booking rejected successfully",
//         })
//     } catch (error) {
//         console.error("Error rejecting booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// export const completeB2CBooking = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { bookingId } = req.params

//         const booking = await B2CPassengerBooking.findById(bookingId)

//         if (!booking) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Booking not found",
//             })
//         }

//         if (booking.b2cPartnerId.toString() !== partnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized",
//             })
//         }

//         if (booking.bookingStatus !== "CONFIRMED") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Booking must be confirmed before completing",
//             })
//         }

//         booking.bookingStatus = "COMPLETED"
//         booking.completedAt = new Date()
//         await booking.save()

//         // Process wallet payment
//         let driverWallet = await Wallet.findOne({ userId: booking.b2cPartnerId })
//         if (!driverWallet) {
//             driverWallet = new Wallet({
//                 userId: booking.b2cPartnerId,
//                 balance: 0,
//                 totalEarnings: 0,
//                 totalWithdrawals: 0,
//             })
//         }

//         if (booking.paymentMethod === "CASH") {
//             // For cash payment, driver already has the money
//             // Deduct admin commission from wallet
//             const commissionData = calculateCommission(booking.paymentAmount)
//             driverWallet.balance -= commissionData.adminCommission
//             driverWallet.totalEarnings += commissionData.fleetOwnerAmount

//             // Create transaction record for commission deduction
//             if (!driverWallet.transactions) driverWallet.transactions = []
//             driverWallet.transactions.push({
//                 type: "COMMISSION_DEDUCTION",
//                 amount: commissionData.adminCommission,
//                 description: `Admin commission (${ADMIN_COMMISSION_PERCENTAGE}%) for booking ${booking._id}`,
//                 date: new Date(),
//                 bookingId: booking._id,
//             })
//         } else {
//             // For card payments, add driver earnings to wallet
//             driverWallet.balance += booking.driverEarnings
//             driverWallet.totalEarnings += booking.driverEarnings

//             if (!driverWallet.transactions) driverWallet.transactions = []
//             driverWallet.transactions.push({
//                 type: "BOOKING_EARNING",
//                 amount: booking.driverEarnings,
//                 description: `Earnings from booking ${booking._id}`,
//                 date: new Date(),
//                 bookingId: booking._id,
//             })
//         }

//         await driverWallet.save()

//         // Notify passenger
//         await Notification.create({
//             recipientId: booking.passengerId,
//             type: "RIDE_COMPLETED",
//             title: "Ride Completed",
//             message: "Your ride has been completed. Please rate your experience!",
//             data: {
//                 bookingId: booking._id,
//             },
//             status: "UNREAD",
//         })

//         return res.status(200).json({
//             success: true,
//             booking,
//             message: "Booking completed successfully",
//         })
//     } catch (error) {
//         console.error("Error completing booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Get passenger bookings
// export const getPassengerBookings = async (req, res) => {
//     try {
//         const passengerId = req.userId
//         const { status, type = "all" } = req.query

//         const query = { passengerId }

//         if (status) {
//             query.bookingStatus = status
//         }

//         let bookings = []

//         if (type === "all" || type === "b2c") {
//             const b2cBookings = await B2CPassengerBooking.find(query)
//                 .populate("partnerId", "fullName companyLogo whatsappNumber")
//                 .populate("b2cPartnerId", "fullName companyLogo whatsappNumber")
//                 .sort({ createdAt: -1 })

//             bookings = [...bookings, ...b2cBookings.map((b) => ({ ...b.toObject(), type: "B2C" }))]
//         }

//         if (type === "all" || type === "corporate") {
//             const corporateBookings = await CorporateBooking.find(query)
//                 .populate("corporateOwnerId", "companyName companyLogo")
//                 .populate("routeId", "fromLocation toLocation")
//                 .sort({ createdAt: -1 })

//             bookings = [...bookings, ...corporateBookings.map((b) => ({ ...b.toObject(), type: "CORPORATE" }))]
//         }

//         // Sort all bookings by date
//         bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

//         return res.status(200).json({
//             success: true,
//             bookings,
//             totalBookings: bookings.length,
//         })
//     } catch (error) {
//         console.error("Error fetching passenger bookings:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Get partner bookings
// export const getPartnerBookings = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { status } = req.query

//         const query = { b2cPartnerId: partnerId }

//         if (status) {
//             query.bookingStatus = status
//         }

//         const bookings = await B2CPassengerBooking.find(query)
//             .populate("passengerId", "fullName whatsappNumber email")
//             .sort({ createdAt: -1 })

//         return res.status(200).json({
//             success: true,
//             bookings,
//             totalBookings: bookings.length,
//         })
//     } catch (error) {
//         console.error("Error fetching partner bookings:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// export const getCorporateOwnerBookings = async (req, res) => {
//     try {
//         const corporateOwnerId = req.userId
//         const { status, date } = req.query

//         const query = { corporateOwnerId }

//         if (status) {
//             query.bookingStatus = status
//         }

//         if (date) {
//             const dateObj = new Date(date)
//             query.travelDate = {
//                 $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
//                 $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
//             }
//         }

//         const bookings = await CorporateBooking.find(query)
//             .populate("passengerId", "fullName whatsappNumber email")
//             .populate("routeId", "fromLocation toLocation departureTime")
//             .sort({ travelDate: -1, createdAt: -1 })

//         return res.status(200).json({
//             success: true,
//             bookings,
//             totalBookings: bookings.length,
//         })
//     } catch (error) {
//         console.error("Error fetching corporate owner bookings:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Verify booking payment (Stripe)
// export const verifyBookingPayment = async (req, res) => {
//     try {
//         const { sessionId, bookingId } = req.body

//         const session = await stripe.checkout.sessions.retrieve(sessionId)

//         if (session.payment_status === "paid") {
//             const booking = await B2CPassengerBooking.findById(bookingId || session.metadata?.bookingId)

//             if (booking) {
//                 booking.paymentStatus = "COMPLETED"
//                 booking.transactionId = session.payment_intent
//                 await booking.save()

//                 // Notify partner about confirmed booking
//                 await Notification.create({
//                     recipientId: booking.b2cPartnerId,
//                     type: "NEW_BOOKING",
//                     title: "New Paid Booking",
//                     message: `Payment received for booking. Amount: AED ${booking.paymentAmount}`,
//                     data: {
//                         bookingId: booking._id,
//                         paymentAmount: booking.paymentAmount,
//                     },
//                     status: "UNREAD",
//                 })

//                 return res.status(200).json({
//                     success: true,
//                     booking,
//                     message: "Payment verified successfully",
//                 })
//             }
//         }

//         return res.status(400).json({
//             success: false,
//             message: "Payment not completed",
//         })
//     } catch (error) {
//         console.error("Error verifying booking payment:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// export const handleTapWebhook = async (req, res) => {
//     try {
//         const { id, status, metadata } = req.body

//         if (!metadata?.bookingId) {
//             return res.status(400).json({ success: false, message: "Invalid webhook data" })
//         }

//         const booking = await B2CPassengerBooking.findById(metadata.bookingId)
//         if (!booking) {
//             return res.status(404).json({ success: false, message: "Booking not found" })
//         }

//         if (status === "CAPTURED") {
//             booking.paymentStatus = "COMPLETED"
//             booking.transactionId = id
//             await booking.save()

//             await Notification.create({
//                 recipientId: booking.b2cPartnerId,
//                 type: "NEW_BOOKING",
//                 title: "New Paid Booking",
//                 message: `Payment received via Tap. Amount: AED ${booking.paymentAmount}`,
//                 data: {
//                     bookingId: booking._id,
//                     paymentAmount: booking.paymentAmount,
//                 },
//                 status: "UNREAD",
//             })
//         } else if (status === "FAILED" || status === "DECLINED") {
//             booking.paymentStatus = "FAILED"
//             booking.bookingStatus = "CANCELLED"
//             await booking.save()
//         }

//         return res.status(200).json({ success: true })
//     } catch (error) {
//         console.error("TAP webhook error:", error)
//         return res.status(500).json({ success: false, message: "Webhook processing failed" })
//     }
// }

// export const handleStripeWebhook = async (req, res) => {
//     const sig = req.headers["stripe-signature"]
//     let event

//     try {
//         event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
//     } catch (err) {
//         console.error("Stripe webhook signature verification failed:", err.message)
//         return res.status(400).send(`Webhook Error: ${err.message}`)
//     }

//     if (event.type === "checkout.session.completed") {
//         const session = event.data.object

//         if (session.metadata?.type === "B2C_BOOKING") {
//             const booking = await B2CPassengerBooking.findById(session.metadata.bookingId)
//             if (booking) {
//                 booking.paymentStatus = "COMPLETED"
//                 booking.transactionId = session.payment_intent
//                 await booking.save()

//                 await Notification.create({
//                     recipientId: booking.b2cPartnerId,
//                     type: "NEW_BOOKING",
//                     title: "New Paid Booking",
//                     message: `Payment received via Stripe. Amount: AED ${booking.paymentAmount}`,
//                     data: {
//                         bookingId: booking._id,
//                         paymentAmount: booking.paymentAmount,
//                     },
//                     status: "UNREAD",
//                 })
//             }
//         }
//     }

//     res.json({ received: true })
// }

// export const getAvailableSeats = async (req, res) => {
//     try {
//         const { routeId, date } = req.query

//         if (!routeId || !date) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Route ID and date are required",
//             })
//         }

//         const route = await Route.findById(routeId)
//         if (!route) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Route not found",
//             })
//         }

//         const dateObj = new Date(date)
//         const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0))
//         const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999))

//         const b2cBookedSeats = await B2CPassengerBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: { $gte: startOfDay, $lt: endOfDay },
//                     bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
//                 },
//             },
//             { $group: { _id: null, totalSeats: { $sum: "$numberOfSeats" } } },
//         ])

//         const corporateBookedSeats = await CorporateBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: { $gte: startOfDay, $lt: endOfDay },
//                     bookingStatus: "CONFIRMED",
//                 },
//             },
//             { $group: { _id: null, totalSeats: { $sum: "$numberOfSeats" } } },
//         ])

//         const totalBooked = (b2cBookedSeats[0]?.totalSeats || 0) + (corporateBookedSeats[0]?.totalSeats || 0)
//         const totalSeats = route.totalSeats || route.availableSeats || 0
//         const availableSeats = Math.max(0, totalSeats - totalBooked)

//         return res.status(200).json({
//             success: true,
//             totalSeats,
//             bookedSeats: totalBooked,
//             availableSeats,
//             date,
//         })
//     } catch (error) {
//         console.error("Error getting available seats:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// import B2CPassengerBooking from "../models/B2CPassengerBooking.js"
// import CorporateBooking from "../models/CorporateBooking.js"
// import User from "../models/User.js"
// import Route from "../models/Route.js"
// import Wallet from "../models/Wallet.js"
// import Notification from "../models/Notification.js"
// import stripe from "../Config/stripe.js"
// import tapPayments from "../Config/tapPayments.js"
// import { calculateCommission, ADMIN_COMMISSION_PERCENTAGE } from "../Services/HelperUtilities.js"

// // Check if route is available for booking
// export const checkRouteAvailability = async (req, res) => {
//     try {
//         const { routeId, travelDate } = req.body
//         const today = new Date()
//         today.setHours(0, 0, 0, 0)

//         const travelDateObj = new Date(travelDate)
//         travelDateObj.setHours(0, 0, 0, 0)

//         if (travelDateObj < today) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Cannot book for past dates",
//                 isAvailable: false,
//             })
//         }

//         const route = await Route.findById(routeId)
//         if (!route) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Route not found",
//                 isAvailable: false,
//             })
//         }

//         const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
//         const dayOfWeek = daysOfWeek[travelDateObj.getDay()]

//         const routeStartDate = new Date(route.startDate)
//         routeStartDate.setHours(0, 0, 0, 0)

//         if (travelDateObj < routeStartDate) {
//             return res.status(200).json({
//                 success: true,
//                 isAvailable: false,
//                 reason: "Route has not started yet",
//                 dayOfWeek,
//                 startDate: route.startDate,
//             })
//         }

//         const isAvailableDay = route.availableDays && route.availableDays.includes(dayOfWeek)

//         if (!isAvailableDay) {
//             return res.status(200).json({
//                 success: true,
//                 isAvailable: false,
//                 reason: "Route not available on this day",
//                 dayOfWeek,
//                 availableDays: route.availableDays,
//             })
//         }

//         const b2cBookedSeats = await B2CPassengerBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: {
//                         $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                         $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                     },
//                     bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSeats: { $sum: "$numberOfSeats" },
//                 },
//             },
//         ])

//         const corporateBookedSeats = await CorporateBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: {
//                         $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                         $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                     },
//                     bookingStatus: { $in: ["CONFIRMED"] },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSeats: { $sum: "$numberOfSeats" },
//                 },
//             },
//         ])

//         const totalBookedSeats = (b2cBookedSeats[0]?.totalSeats || 0) + (corporateBookedSeats[0]?.totalSeats || 0)
//         const availableSeats = (route.totalSeats || route.availableSeats || 0) - totalBookedSeats

//         return res.status(200).json({
//             success: true,
//             isAvailable: availableSeats > 0,
//             dayOfWeek,
//             availableSeats: Math.max(0, availableSeats),
//             totalSeats: route.totalSeats || route.availableSeats || 0,
//             bookedSeats: totalBookedSeats,
//             message: availableSeats > 0 ? "Route is available for booking" : "No seats available",
//         })
//     } catch (error) {
//         console.error("Error checking route availability:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error while checking availability",
//         })
//     }
// }

// // Create B2C Passenger Booking
// export const createB2CBooking = async (req, res) => {
//     try {
//         const passengerId = req.userId
//         const {
//             routeId,
//             partnerId,
//             pickupLocation,
//             dropoffLocation,
//             travelDate,
//             numberOfSeats = 1,
//             paymentMethod,
//             paymentAmount,
//             travelPath,
//             vehicleModel,
//             vehiclePlate,
//             driverName,
//             driverImage,
//             passengerNotes,
//         } = req.body

//         if (!passengerId || !partnerId || !pickupLocation || !dropoffLocation || !travelDate || !paymentAmount) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields",
//             })
//         }

//         const passenger = await User.findById(passengerId)
//         if (!passenger) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Passenger not found",
//             })
//         }

//         const b2cPartner = await User.findById(partnerId)
//         if (!b2cPartner || b2cPartner.role !== "B2C_PARTNER") {
//             return res.status(404).json({
//                 success: false,
//                 message: "B2C Partner not found",
//             })
//         }

//         // Find the route listing in partner's routeListings array
//         const routeListing = b2cPartner.routeListings?.find((route) => route._id?.toString() === routeId)
//         if (!routeListing) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Route listing not found",
//             })
//         }

//         const bookedSeatsResult = await B2CPassengerBooking.aggregate([
//             {
//                 $match: {
//                     routeListingId: routeId,
//                     travelDate: {
//                         $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                         $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                     },
//                     bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSeats: { $sum: "$numberOfSeats" },
//                 },
//             },
//         ])

//         const bookedSeats = bookedSeatsResult[0]?.totalSeats || 0
//         const availableSeats = (routeListing.availableSeats || routeListing.totalSeats || 0) - bookedSeats

//         if (numberOfSeats > availableSeats) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Only ${availableSeats} seat(s) available. You requested ${numberOfSeats}.`,
//             })
//         }

//         const commissionData = calculateCommission(paymentAmount, ADMIN_COMMISSION_PERCENTAGE)

//         const booking = new B2CPassengerBooking({
//             passengerId,
//             b2cPartnerId: partnerId,
//             partnerId,
//             routeListingId: routeId, // Store routeListingId instead of routeId
//             pickupLocation,
//             dropoffLocation,
//             travelPath,
//             bookingDate: new Date(),
//             travelDate,
//             numberOfSeats,
//             paymentAmount,
//             paymentMethod,
//             bookingStatus: "PENDING",
//             vehicleModel: routeListing.vehicleModel,
//             vehiclePlate: routeListing.vehiclePlate,
//             driverName: routeListing.driverName,
//             driverImage: routeListing.driverImage,
//             passengerNotes,
//             adminCommissionAmount: paymentMethod === "CASH" ? 0 : commissionData.adminCommission,
//             driverEarnings: paymentMethod === "CASH" ? paymentAmount : commissionData.fleetOwnerAmount,
//         })

//         await booking.save()

//         await User.updateOne(
//             { _id: partnerId, "routeListings._id": routeId },
//             {
//                 $inc: { "routeListings.$.availableSeats": -numberOfSeats },
//             },
//         )

//         if (paymentMethod === "STRIPE") {
//             const session = await stripe.checkout.sessions.create({
//                 payment_method_types: ["card"],
//                 mode: "payment",
//                 line_items: [
//                     {
//                         price_data: {
//                             currency: "aed",
//                             product_data: {
//                                 name: "DriveMe Booking",
//                                 description: `Booking from ${pickupLocation} to ${dropoffLocation}`,
//                             },
//                             unit_amount: Math.round(paymentAmount * 100),
//                         },
//                         quantity: 1,
//                     },
//                 ],
//                 success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
//                 cancel_url: `${process.env.FRONTEND_URL}/booking/cancelled?booking_id=${booking._id}`,
//                 customer_email: passenger.email,
//                 metadata: {
//                     bookingId: booking._id.toString(),
//                     type: "B2C_BOOKING",
//                     passengerId: passengerId.toString(),
//                     partnerId: partnerId.toString(),
//                 },
//             })

//             booking.transactionId = session.id
//             booking.paymentStatus = "PENDING"
//             await booking.save()

//             return res.status(201).json({
//                 success: true,
//                 booking,
//                 paymentData: {
//                     provider: "STRIPE",
//                     paymentUrl: session.url,
//                     sessionId: session.id,
//                 },
//                 message: "Booking created. Complete payment to confirm.",
//             })
//         } else if (paymentMethod === "TAP") {
//             const chargeData = await tapPayments.createCharge({
//                 amount: paymentAmount,
//                 currency: "AED",
//                 customer: {
//                     firstName: passenger.fullName?.split(" ")[0] || "Customer",
//                     lastName: passenger.fullName?.split(" ").slice(1).join(" ") || "",
//                     email: passenger.email,
//                     countryCode: "971",
//                     phone: passenger.whatsappNumber || passenger.phone || "",
//                 },
//                 redirectUrl: `${process.env.FRONTEND_URL}/booking/success?booking_id=${booking._id}`,
//                 webhookUrl: `${process.env.BACKEND_URL}/api/bookings/tap-webhook`,
//                 metadata: {
//                     bookingId: booking._id.toString(),
//                     type: "B2C_BOOKING",
//                 },
//                 description: `DriveMe Booking: ${pickupLocation} to ${dropoffLocation}`,
//             })

//             booking.transactionId = chargeData.id
//             booking.paymentStatus = "PENDING"
//             await booking.save()

//             return res.status(201).json({
//                 success: true,
//                 booking,
//                 paymentData: {
//                     provider: "TAP",
//                     paymentUrl: chargeData.transaction?.url || chargeData.redirect?.url,
//                     chargeId: chargeData.id,
//                 },
//                 message: "Booking created. Complete payment to confirm.",
//             })
//         } else {
//             // CASH payment
//             await Notification.create({
//                 recipientId: partnerId,
//                 userId: partnerId,
//                 type: "NEW_BOOKING",
//                 title: "New Booking Request (Cash Payment)",
//                 message: `New booking from ${passenger.fullName} - Amount: AED ${paymentAmount}`,
//                 data: {
//                     bookingId: booking._id,
//                     passengerId,
//                     pickupLocation,
//                     dropoffLocation,
//                     travelDate,
//                     paymentAmount,
//                     paymentMethod: "CASH",
//                 },
//                 status: "UNREAD",
//             })

//             return res.status(201).json({
//                 success: true,
//                 booking,
//                 message: "Booking created successfully. Partner will review your request.",
//             })
//         }
//     } catch (error) {
//         console.error("Error creating B2C booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: error.message || "Server error while creating booking",
//         })
//     }
// }

// // Create Corporate Booking
// export const createCorporateBooking = async (req, res) => {
//     try {
//         const passengerId = req.userId
//         const {
//             routeId,
//             contractId,
//             corporateOwnerId,
//             pickupLocation,
//             dropoffLocation,
//             travelDate,
//             numberOfSeats = 1,
//             travelPath,
//             vehicleModel,
//             vehiclePlate,
//             driverName,
//             driverImage,
//             passengerNotes,
//         } = req.body

//         console.log("req.body", req.body);


//         if (!routeId || !corporateOwnerId || !travelDate) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields",
//             })
//         }

//         const passenger = await User.findById(passengerId)
//         if (!passenger) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Passenger not found",
//             })
//         }

//         if (!passenger.companyId || passenger.companyId.toString() !== corporateOwnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized: Employee does not belong to this company",
//             })
//         }

//         if (numberOfSeats > 1) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Corporate employees can only book 1 seat per journey",
//             })
//         }

//         const route = await Route.findById(routeId)
//         if (!route) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Route not found",
//             })
//         }

//         const corporateBookedSeatsResult = await CorporateBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: {
//                         $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
//                         $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
//                     },
//                     bookingStatus: "CONFIRMED",
//                 },
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalSeats: { $sum: "$numberOfSeats" },
//                 },
//             },
//         ])

//         const bookedSeats = corporateBookedSeatsResult[0]?.totalSeats || 0
//         const availableSeats = (route.totalSeats || route.availableSeats || 0) - bookedSeats

//         if (numberOfSeats > availableSeats) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Only ${availableSeats} seat(s) available. You requested ${numberOfSeats}.`,
//             })
//         }

//         const booking = new CorporateBooking({
//             passengerId,
//             corporateOwnerId,
//             routeId,
//             contractId: contractId || null,
//             pickupLocation,
//             dropoffLocation,
//             travelPath,
//             bookingDate: new Date(),
//             travelDate,
//             numberOfSeats,
//             bookingStatus: "CONFIRMED",
//             vehicleModel,
//             vehiclePlate,
//             driverName,
//             driverImage,
//             passengerNotes,
//         })

//         await booking.save()

//         await Route.updateOne(
//             { _id: routeId },
//             {
//                 $inc: { availableSeats: -numberOfSeats },
//             },
//         )

//         // Send notification to corporate owner
//         const corporateOwner = await User.findById(corporateOwnerId)
//         await Notification.create({
//             recipientId: corporateOwnerId,
//             userId: corporateOwnerId,
//             type: "CORPORATE_BOOKING",
//             title: "Employee Booking Confirmed",
//             message: `${passenger.fullName} has booked ${numberOfSeats} seat(s) for ${new Date(travelDate).toLocaleDateString()}`,
//             data: {
//                 bookingId: booking._id,
//                 passengerId,
//                 employeeName: passenger.fullName,
//                 pickupLocation,
//                 dropoffLocation,
//                 travelDate,
//                 numberOfSeats,
//             },
//             status: "UNREAD",
//         })

//         // Send confirmation to passenger
//         await Notification.create({
//             recipientId: passengerId,
//             userId: passengerId,
//             type: "BOOKING_CONFIRMED",
//             title: "Booking Confirmed",
//             message: `Your booking for ${new Date(travelDate).toLocaleDateString()} has been confirmed`,
//             data: {
//                 bookingId: booking._id,
//                 pickupLocation,
//                 dropoffLocation,
//                 travelDate,
//                 companyName: corporateOwner?.companyName || "Your Company",
//             },
//             status: "UNREAD",
//         })

//         return res.status(201).json({
//             success: true,
//             booking,
//             message: "Booking confirmed successfully",
//         })
//     } catch (error) {
//         console.error("Error creating corporate booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: error.message || "Server error while creating corporate booking",
//         })
//     }
// }

// // Partner: Accept Booking
// export const acceptB2CBooking = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { bookingId } = req.params

//         const booking = await B2CPassengerBooking.findById(bookingId)

//         if (!booking) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Booking not found",
//             })
//         }

//         if (booking.b2cPartnerId.toString() !== partnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized: This booking does not belong to you",
//             })
//         }

//         booking.bookingStatus = "CONFIRMED"
//         await booking.save()

//         const passenger = await User.findById(booking.passengerId)
//         await Notification.create({
//             recipientId: booking.passengerId,
//             type: "BOOKING_ACCEPTED",
//             title: "Booking Accepted",
//             message: `Your booking has been accepted. Get ready for your ride!`,
//             data: {
//                 bookingId: booking._id,
//                 pickupLocation: booking.pickupLocation,
//                 dropoffLocation: booking.dropoffLocation,
//                 travelDate: booking.travelDate,
//             },
//             status: "UNREAD",
//         })

//         return res.status(200).json({
//             success: true,
//             booking,
//             message: "Booking accepted successfully",
//         })
//     } catch (error) {
//         console.error("Error accepting booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Partner: Reject Booking
// export const rejectB2CBooking = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { bookingId } = req.params
//         const { rejectionReason } = req.body

//         const booking = await B2CPassengerBooking.findById(bookingId)

//         if (!booking) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Booking not found",
//             })
//         }

//         if (booking.b2cPartnerId.toString() !== partnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized",
//             })
//         }

//         booking.bookingStatus = "REJECTED"
//         booking.rejectionReason = rejectionReason || "No reason provided"

//         if (booking.paymentStatus === "COMPLETED" && booking.transactionId) {
//             try {
//                 if (booking.paymentMethod === "STRIPE") {
//                     // Create refund via Stripe
//                     const refund = await stripe.refunds.create({
//                         payment_intent: booking.transactionId,
//                         reason: "requested_by_customer",
//                     })
//                     booking.paymentStatus = "REFUNDED"
//                     booking.refundId = refund.id
//                 } else if (booking.paymentMethod === "TAP") {
//                     // TAP refund would need to be implemented
//                     booking.paymentStatus = "REFUND_PENDING"
//                 }
//             } catch (refundError) {
//                 console.error("Refund error:", refundError)
//                 booking.paymentStatus = "REFUND_FAILED"
//             }
//         }

//         await booking.save()

//         await Notification.create({
//             recipientId: booking.passengerId,
//             type: "BOOKING_REJECTED",
//             title: "Booking Rejected",
//             message: `Your booking has been rejected. Reason: ${booking.rejectionReason}`,
//             data: {
//                 bookingId: booking._id,
//                 rejectionReason: booking.rejectionReason,
//             },
//             status: "UNREAD",
//         })

//         return res.status(200).json({
//             success: true,
//             booking,
//             message: "Booking rejected successfully",
//         })
//     } catch (error) {
//         console.error("Error rejecting booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// export const completeB2CBooking = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { bookingId } = req.params

//         const booking = await B2CPassengerBooking.findById(bookingId)

//         if (!booking) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Booking not found",
//             })
//         }

//         if (booking.b2cPartnerId.toString() !== partnerId) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Unauthorized",
//             })
//         }

//         if (booking.bookingStatus !== "CONFIRMED") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Booking must be confirmed before completing",
//             })
//         }

//         booking.bookingStatus = "COMPLETED"
//         booking.completedAt = new Date()
//         await booking.save()

//         // Process wallet payment
//         let driverWallet = await Wallet.findOne({ userId: booking.b2cPartnerId })
//         if (!driverWallet) {
//             driverWallet = new Wallet({
//                 userId: booking.b2cPartnerId,
//                 balance: 0,
//                 totalEarnings: 0,
//                 totalWithdrawals: 0,
//             })
//         }

//         if (booking.paymentMethod === "CASH") {
//             // For cash payment, driver already has the money
//             // Deduct admin commission from wallet
//             const commissionData = calculateCommission(booking.paymentAmount)
//             driverWallet.balance -= commissionData.adminCommission
//             driverWallet.totalEarnings += commissionData.fleetOwnerAmount

//             // Create transaction record for commission deduction
//             if (!driverWallet.transactions) driverWallet.transactions = []
//             driverWallet.transactions.push({
//                 type: "COMMISSION_DEDUCTION",
//                 amount: commissionData.adminCommission,
//                 description: `Admin commission (${ADMIN_COMMISSION_PERCENTAGE}%) for booking ${booking._id}`,
//                 date: new Date(),
//                 bookingId: booking._id,
//             })
//         } else {
//             // For card payments, add driver earnings to wallet
//             driverWallet.balance += booking.driverEarnings
//             driverWallet.totalEarnings += booking.driverEarnings

//             if (!driverWallet.transactions) driverWallet.transactions = []
//             driverWallet.transactions.push({
//                 type: "BOOKING_EARNING",
//                 amount: booking.driverEarnings,
//                 description: `Earnings from booking ${booking._id}`,
//                 date: new Date(),
//                 bookingId: booking._id,
//             })
//         }

//         await driverWallet.save()

//         // Notify passenger
//         await Notification.create({
//             recipientId: booking.passengerId,
//             type: "RIDE_COMPLETED",
//             title: "Ride Completed",
//             message: "Your ride has been completed. Please rate your experience!",
//             data: {
//                 bookingId: booking._id,
//             },
//             status: "UNREAD",
//         })

//         return res.status(200).json({
//             success: true,
//             booking,
//             message: "Booking completed successfully",
//         })
//     } catch (error) {
//         console.error("Error completing booking:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Get passenger bookings
// export const getPassengerBookings = async (req, res) => {
//     try {
//         const passengerId = req.userId
//         const { status, type = "all" } = req.query

//         const query = { passengerId }

//         if (status) {
//             query.bookingStatus = status
//         }

//         let bookings = []

//         if (type === "all" || type === "b2c") {
//             const b2cBookings = await B2CPassengerBooking.find(query)
//                 .populate("partnerId", "fullName companyLogo whatsappNumber")
//                 .populate("b2cPartnerId", "fullName companyLogo whatsappNumber")
//                 .sort({ createdAt: -1 })

//             bookings = [...bookings, ...b2cBookings.map((b) => ({ ...b.toObject(), type: "B2C" }))]
//         }

//         if (type === "all" || type === "corporate") {
//             const corporateBookings = await CorporateBooking.find(query)
//                 .populate("corporateOwnerId", "companyName companyLogo")
//                 .populate("routeId", "fromLocation toLocation")
//                 .sort({ createdAt: -1 })

//             bookings = [...bookings, ...corporateBookings.map((b) => ({ ...b.toObject(), type: "CORPORATE" }))]
//         }

//         // Sort all bookings by date
//         bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

//         return res.status(200).json({
//             success: true,
//             bookings,
//             totalBookings: bookings.length,
//         })
//     } catch (error) {
//         console.error("Error fetching passenger bookings:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Get partner bookings
// export const getPartnerBookings = async (req, res) => {
//     try {
//         const partnerId = req.userId
//         const { status } = req.query

//         const query = { b2cPartnerId: partnerId }

//         if (status) {
//             query.bookingStatus = status
//         }

//         const bookings = await B2CPassengerBooking.find(query)
//             .populate("passengerId", "fullName whatsappNumber email")
//             .sort({ createdAt: -1 })

//         return res.status(200).json({
//             success: true,
//             bookings,
//             totalBookings: bookings.length,
//         })
//     } catch (error) {
//         console.error("Error fetching partner bookings:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// export const getCorporateOwnerBookings = async (req, res) => {
//     try {
//         const corporateOwnerId = req.userId
//         const { status, date } = req.query

//         const query = { corporateOwnerId }

//         if (status) {
//             query.bookingStatus = status
//         }

//         if (date) {
//             const dateObj = new Date(date)
//             query.travelDate = {
//                 $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
//                 $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
//             }
//         }

//         const bookings = await CorporateBooking.find(query)
//             .populate("passengerId", "fullName whatsappNumber email")
//             .populate("routeId", "fromLocation toLocation departureTime")
//             .sort({ travelDate: -1, createdAt: -1 })

//         return res.status(200).json({
//             success: true,
//             bookings,
//             totalBookings: bookings.length,
//         })
//     } catch (error) {
//         console.error("Error fetching corporate owner bookings:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// // Verify booking payment (Stripe)
// export const verifyBookingPayment = async (req, res) => {
//     try {
//         const { sessionId, bookingId } = req.body

//         const session = await stripe.checkout.sessions.retrieve(sessionId)

//         if (session.payment_status === "paid") {
//             const booking = await B2CPassengerBooking.findById(bookingId || session.metadata?.bookingId)

//             if (booking) {
//                 booking.paymentStatus = "COMPLETED"
//                 booking.transactionId = session.payment_intent
//                 await booking.save()

//                 // Notify partner about confirmed booking
//                 await Notification.create({
//                     recipientId: booking.b2cPartnerId,
//                     type: "NEW_BOOKING",
//                     title: "New Paid Booking",
//                     message: `Payment received for booking. Amount: AED ${booking.paymentAmount}`,
//                     data: {
//                         bookingId: booking._id,
//                         paymentAmount: booking.paymentAmount,
//                     },
//                     status: "UNREAD",
//                 })

//                 return res.status(200).json({
//                     success: true,
//                     booking,
//                     message: "Payment verified successfully",
//                 })
//             }
//         }

//         return res.status(400).json({
//             success: false,
//             message: "Payment not completed",
//         })
//     } catch (error) {
//         console.error("Error verifying booking payment:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// export const handleTapWebhook = async (req, res) => {
//     try {
//         const { id, status, metadata } = req.body

//         if (!metadata?.bookingId) {
//             return res.status(400).json({ success: false, message: "Invalid webhook data" })
//         }

//         const booking = await B2CPassengerBooking.findById(metadata.bookingId)
//         if (!booking) {
//             return res.status(404).json({ success: false, message: "Booking not found" })
//         }

//         if (status === "CAPTURED") {
//             booking.paymentStatus = "COMPLETED"
//             booking.transactionId = id
//             await booking.save()

//             await Notification.create({
//                 recipientId: booking.b2cPartnerId,
//                 type: "NEW_BOOKING",
//                 title: "New Paid Booking",
//                 message: `Payment received via Tap. Amount: AED ${booking.paymentAmount}`,
//                 data: {
//                     bookingId: booking._id,
//                     paymentAmount: booking.paymentAmount,
//                 },
//                 status: "UNREAD",
//             })
//         } else if (status === "FAILED" || status === "DECLINED") {
//             booking.paymentStatus = "FAILED"
//             booking.bookingStatus = "CANCELLED"
//             await booking.save()
//         }

//         return res.status(200).json({ success: true })
//     } catch (error) {
//         console.error("TAP webhook error:", error)
//         return res.status(500).json({ success: false, message: "Webhook processing failed" })
//     }
// }

// export const handleStripeWebhook = async (req, res) => {
//     const sig = req.headers["stripe-signature"]
//     let event

//     try {
//         event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
//     } catch (err) {
//         console.error("Stripe webhook signature verification failed:", err.message)
//         return res.status(400).send(`Webhook Error: ${err.message}`)
//     }

//     if (event.type === "checkout.session.completed") {
//         const session = event.data.object

//         if (session.metadata?.type === "B2C_BOOKING") {
//             const booking = await B2CPassengerBooking.findById(session.metadata.bookingId)
//             if (booking) {
//                 booking.paymentStatus = "COMPLETED"
//                 booking.transactionId = session.payment_intent
//                 await booking.save()

//                 await Notification.create({
//                     recipientId: booking.b2cPartnerId,
//                     type: "NEW_BOOKING",
//                     title: "New Paid Booking",
//                     message: `Payment received via Stripe. Amount: AED ${booking.paymentAmount}`,
//                     data: {
//                         bookingId: booking._id,
//                         paymentAmount: booking.paymentAmount,
//                     },
//                     status: "UNREAD",
//                 })
//             }
//         }
//     }

//     res.json({ received: true })
// }

// export const getAvailableSeats = async (req, res) => {
//     try {
//         const { routeId, date } = req.query

//         if (!routeId || !date) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Route ID and date are required",
//             })
//         }

//         const route = await Route.findById(routeId)
//         if (!route) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Route not found",
//             })
//         }

//         const dateObj = new Date(date)
//         const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0))
//         const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999))

//         const b2cBookedSeats = await B2CPassengerBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: { $gte: startOfDay, $lt: endOfDay },
//                     bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
//                 },
//             },
//             { $group: { _id: null, totalSeats: { $sum: "$numberOfSeats" } } },
//         ])

//         const corporateBookedSeats = await CorporateBooking.aggregate([
//             {
//                 $match: {
//                     routeId: route._id,
//                     travelDate: { $gte: startOfDay, $lt: endOfDay },
//                     bookingStatus: "CONFIRMED",
//                 },
//             },
//             { $group: { _id: null, totalSeats: { $sum: "$numberOfSeats" } } },
//         ])

//         const totalBooked = (b2cBookedSeats[0]?.totalSeats || 0) + (corporateBookedSeats[0]?.totalSeats || 0)
//         const totalSeats = route.totalSeats || route.availableSeats || 0
//         const availableSeats = Math.max(0, totalSeats - totalBooked)

//         return res.status(200).json({
//             success: true,
//             totalSeats,
//             bookedSeats: totalBooked,
//             availableSeats,
//             date,
//         })
//     } catch (error) {
//         console.error("Error getting available seats:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }


import B2CPassengerBooking from "../models/B2CPassengerBooking.js"
import CorporateBooking from "../models/CorporateBooking.js"
import User from "../models/User.js"
import Route from "../models/Route.js"
import Wallet from "../models/Wallet.js"
import Notification from "../models/Notification.js"
import stripe from "../Config/stripe.js"
import tapPayments from "../Config/tapPayments.js"
import { calculateCommission, ADMIN_COMMISSION_PERCENTAGE } from "../Services/HelperUtilities.js"

// Check if route is available for booking
export const checkRouteAvailability = async (req, res) => {
    try {
        const { routeId, travelDate } = req.body
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const travelDateObj = new Date(travelDate)
        travelDateObj.setHours(0, 0, 0, 0)

        if (travelDateObj < today) {
            return res.status(400).json({
                success: false,
                message: "Cannot book for past dates",
                isAvailable: false,
            })
        }

        const route = await Route.findById(routeId)
        if (!route) {
            return res.status(404).json({
                success: false,
                message: "Route not found",
                isAvailable: false,
            })
        }

        const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
        const dayOfWeek = daysOfWeek[travelDateObj.getDay()]

        const routeStartDate = new Date(route.startDate)
        routeStartDate.setHours(0, 0, 0, 0)

        if (travelDateObj < routeStartDate) {
            return res.status(200).json({
                success: true,
                isAvailable: false,
                reason: "Route has not started yet",
                dayOfWeek,
                startDate: route.startDate,
            })
        }

        const isAvailableDay = route.availableDays && route.availableDays.includes(dayOfWeek)

        if (!isAvailableDay) {
            return res.status(200).json({
                success: true,
                isAvailable: false,
                reason: "Route not available on this day",
                dayOfWeek,
                availableDays: route.availableDays,
            })
        }

        const b2cBookedSeats = await B2CPassengerBooking.aggregate([
            {
                $match: {
                    routeId: route._id,
                    travelDate: {
                        $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
                        $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
                    },
                    bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSeats: { $sum: "$numberOfSeats" },
                },
            },
        ])

        const corporateBookedSeats = await CorporateBooking.aggregate([
            {
                $match: {
                    routeId: route._id,
                    travelDate: {
                        $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
                        $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
                    },
                    bookingStatus: { $in: ["CONFIRMED"] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSeats: { $sum: "$numberOfSeats" },
                },
            },
        ])

        const totalBookedSeats = (b2cBookedSeats[0]?.totalSeats || 0) + (corporateBookedSeats[0]?.totalSeats || 0)
        const availableSeats = (route.totalSeats || route.availableSeats || 0) - totalBookedSeats

        return res.status(200).json({
            success: true,
            isAvailable: availableSeats > 0,
            dayOfWeek,
            availableSeats: Math.max(0, availableSeats),
            totalSeats: route.totalSeats || route.availableSeats || 0,
            bookedSeats: totalBookedSeats,
            message: availableSeats > 0 ? "Route is available for booking" : "No seats available",
        })
    } catch (error) {
        console.error("Error checking route availability:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while checking availability",
        })
    }
}

// Create B2C Passenger Booking
export const createB2CBooking = async (req, res) => {
    try {
        const passengerId = req.userId
        const {
            routeId,
            partnerId,
            pickupLocation,
            dropoffLocation,
            travelDate,
            numberOfSeats = 1,
            paymentMethod,
            paymentAmount,
            travelPath,
            vehicleModel,
            vehiclePlate,
            driverName,
            driverImage,
            passengerNotes,
        } = req.body

        console.log("req.body", req.body);


        if (!passengerId || !partnerId || !pickupLocation || !dropoffLocation || !travelDate || !paymentAmount) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            })
        }

        const passenger = await User.findById(passengerId)
        if (!passenger) {
            return res.status(404).json({
                success: false,
                message: "Passenger not found",
            })
        }

        const b2cPartner = await User.findById(partnerId)
        if (!b2cPartner || b2cPartner.role !== "B2C_PARTNER") {
            return res.status(404).json({
                success: false,
                message: "B2C Partner not found",
            })
        }

        // Find the route listing in partner's routeListings array
        const routeListing = b2cPartner.routeListings?.find((route) => route._id?.toString() === routeId)
        if (!routeListing) {
            return res.status(404).json({
                success: false,
                message: "Route listing not found",
            })
        }

        const bookedSeatsResult = await B2CPassengerBooking.aggregate([
            {
                $match: {
                    routeListingId: routeId,
                    travelDate: {
                        $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
                        $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
                    },
                    bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSeats: { $sum: "$numberOfSeats" },
                },
            },
        ])

        const bookedSeats = bookedSeatsResult[0]?.totalSeats || 0
        const availableSeats = (routeListing.availableSeats || routeListing.totalSeats || 0) - bookedSeats

        if (numberOfSeats > availableSeats) {
            return res.status(400).json({
                success: false,
                message: `Only ${availableSeats} seat(s) available. You requested ${numberOfSeats}.`,
            })
        }

        const commissionData = calculateCommission(paymentAmount, ADMIN_COMMISSION_PERCENTAGE)

        const booking = new B2CPassengerBooking({
            passengerId,
            b2cPartnerId: partnerId,
            partnerId,
            routeListingId: routeId, // Store routeListingId instead of routeId
            pickupLocation,
            dropoffLocation,
            travelPath,
            bookingDate: new Date(),
            travelDate,
            numberOfSeats,
            paymentAmount,
            paymentMethod,
            bookingStatus: "PENDING",
            vehicleModel: routeListing.vehicleModel,
            vehiclePlate: routeListing.vehiclePlate,
            driverName: routeListing.driverName,
            driverImage: routeListing.driverImage,
            passengerNotes,
            adminCommissionAmount: paymentMethod === "CASH" ? 0 : commissionData.adminCommission,
            driverEarnings: paymentMethod === "CASH" ? paymentAmount : commissionData.fleetOwnerAmount,
        })

        await booking.save()

        const numberOfSeatsInt = Number.parseInt(numberOfSeats) || numberOfSeats
        await User.updateOne(
            { _id: partnerId, "routeListings._id": routeId },
            {
                $inc: { "routeListings.$.availableSeats": -numberOfSeatsInt },
            },
        )

        if (paymentMethod === "STRIPE") {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: "aed",
                            product_data: {
                                name: "DriveMe Booking",
                                description: `Booking from ${pickupLocation} to ${dropoffLocation}`,
                            },
                            unit_amount: Math.round(paymentAmount * 100),
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
                cancel_url: `${process.env.FRONTEND_URL}/booking/cancelled?booking_id=${booking._id}`,
                customer_email: passenger.email,
                metadata: {
                    bookingId: booking._id.toString(),
                    type: "B2C_BOOKING",
                    passengerId: passengerId.toString(),
                    partnerId: partnerId.toString(),
                },
            })

            booking.transactionId = session.id
            booking.paymentStatus = "PENDING"
            await booking.save()

            return res.status(201).json({
                success: true,
                booking,
                paymentData: {
                    provider: "STRIPE",
                    paymentUrl: session.url,
                    sessionId: session.id,
                },
                message: "Booking created. Complete payment to confirm.",
            })
        } else if (paymentMethod === "TAP") {
            const chargeData = await tapPayments.createCharge({
                amount: paymentAmount,
                currency: "AED",
                customer: {
                    firstName: passenger.fullName?.split(" ")[0] || "Customer",
                    lastName: passenger.fullName?.split(" ").slice(1).join(" ") || "",
                    email: passenger.email,
                    countryCode: "971",
                    phone: passenger.whatsappNumber || passenger.phone || "",
                },
                redirectUrl: `${process.env.FRONTEND_URL}/booking/success?booking_id=${booking._id}`,
                webhookUrl: `${process.env.BACKEND_URL}/api/bookings/tap-webhook`,
                metadata: {
                    bookingId: booking._id.toString(),
                    type: "B2C_BOOKING",
                },
                description: `DriveMe Booking: ${pickupLocation} to ${dropoffLocation}`,
            })

            booking.transactionId = chargeData.id
            booking.paymentStatus = "PENDING"
            await booking.save()

            return res.status(201).json({
                success: true,
                booking,
                paymentData: {
                    provider: "TAP",
                    paymentUrl: chargeData.transaction?.url || chargeData.redirect?.url,
                    chargeId: chargeData.id,
                },
                message: "Booking created. Complete payment to confirm.",
            })
        } else {
            // CASH payment
            await Notification.create({
                recipientId: partnerId,
                userId: partnerId,
                type: "NEW_BOOKING",
                title: "New Booking Request (Cash Payment)",
                message: `New booking from ${passenger.fullName} - Amount: AED ${paymentAmount}`,
                data: {
                    bookingId: booking._id,
                    passengerId,
                    pickupLocation,
                    dropoffLocation,
                    travelDate,
                    paymentAmount,
                    paymentMethod: "CASH",
                },
                status: "UNREAD",
            })

            return res.status(201).json({
                success: true,
                booking,
                message: "Booking created successfully. Partner will review your request.",
            })
        }
    } catch (error) {
        console.error("Error creating B2C booking:", error)
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while creating booking",
        })
    }
}

// Create Corporate Booking
export const createCorporateBooking = async (req, res) => {
    try {
        const passengerId = req.userId
        const {
            routeId,
            contractId,
            corporateOwnerId,
            pickupLocation,
            dropoffLocation,
            travelDate,
            numberOfSeats = 1,
            travelPath,
            vehicleModel,
            vehiclePlate,
            driverName,
            driverImage,
            passengerNotes,
        } = req.body

        if (!routeId || !corporateOwnerId || !travelDate) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            })
        }

        const passenger = await User.findById(passengerId)
        if (!passenger) {
            return res.status(404).json({
                success: false,
                message: "Passenger not found",
            })
        }

        if (!passenger.companyId || passenger.companyId.toString() !== corporateOwnerId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Employee does not belong to this company",
            })
        }

        if (numberOfSeats > 1) {
            return res.status(400).json({
                success: false,
                message: "Corporate employees can only book 1 seat per journey",
            })
        }

        const route = await Route.findById(routeId)
        if (!route) {
            return res.status(404).json({
                success: false,
                message: "Route not found",
            })
        }

        const corporateBookedSeatsResult = await CorporateBooking.aggregate([
            {
                $match: {
                    routeId: route._id,
                    travelDate: {
                        $gte: new Date(new Date(travelDate).setHours(0, 0, 0, 0)),
                        $lt: new Date(new Date(travelDate).setHours(23, 59, 59, 999)),
                    },
                    bookingStatus: "CONFIRMED",
                },
            },
            {
                $group: {
                    _id: null,
                    totalSeats: { $sum: "$numberOfSeats" },
                },
            },
        ])

        const bookedSeats = corporateBookedSeatsResult[0]?.totalSeats || 0
        const availableSeats = (route.totalSeats || route.availableSeats || 0) - bookedSeats

        if (numberOfSeats > availableSeats) {
            return res.status(400).json({
                success: false,
                message: `Only ${availableSeats} seat(s) available. You requested ${numberOfSeats}.`,
            })
        }

        const booking = new CorporateBooking({
            passengerId,
            corporateOwnerId,
            routeId,
            contractId: contractId || null,
            pickupLocation,
            dropoffLocation,
            travelPath,
            bookingDate: new Date(),
            travelDate,
            numberOfSeats,
            bookingStatus: "CONFIRMED",
            vehicleModel,
            vehiclePlate,
            driverName,
            driverImage,
            passengerNotes,
        })

        await booking.save()

        await Route.updateOne(
            { _id: routeId },
            {
                $inc: { availableSeats: -numberOfSeats },
            },
        )

        // Send notification to corporate owner
        const corporateOwner = await User.findById(corporateOwnerId)
        await Notification.create({
            recipientId: corporateOwnerId,
            userId: corporateOwnerId,
            type: "CORPORATE_BOOKING",
            title: "Employee Booking Confirmed",
            message: `${passenger.fullName} has booked ${numberOfSeats} seat(s) for ${new Date(travelDate).toLocaleDateString()}`,
            data: {
                bookingId: booking._id,
                passengerId,
                employeeName: passenger.fullName,
                pickupLocation,
                dropoffLocation,
                travelDate,
                numberOfSeats,
            },
            status: "UNREAD",
        })

        // Send confirmation to passenger
        await Notification.create({
            recipientId: passengerId,
            userId: passengerId,
            type: "BOOKING_CONFIRMED",
            title: "Booking Confirmed",
            message: `Your booking for ${new Date(travelDate).toLocaleDateString()} has been confirmed`,
            data: {
                bookingId: booking._id,
                pickupLocation,
                dropoffLocation,
                travelDate,
                companyName: corporateOwner?.companyName || "Your Company",
            },
            status: "UNREAD",
        })

        return res.status(201).json({
            success: true,
            booking,
            message: "Booking confirmed successfully",
        })
    } catch (error) {
        console.error("Error creating corporate booking:", error)
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while creating corporate booking",
        })
    }
}

// Partner: Accept Booking
export const acceptB2CBooking = async (req, res) => {
    try {
        const partnerId = req.userId
        const { bookingId } = req.params

        const booking = await B2CPassengerBooking.findById(bookingId)

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            })
        }

        if (booking.b2cPartnerId.toString() !== partnerId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: This booking does not belong to you",
            })
        }

        booking.bookingStatus = "CONFIRMED"
        await booking.save()

        const passenger = await User.findById(booking.passengerId)
        await Notification.create({
            recipientId: booking.passengerId,
            userId: booking.passengerId,
            type: "BOOKING_ACCEPTED",
            title: "Booking Accepted",
            message: `Your booking has been accepted. Get ready for your ride!`,
            data: {
                bookingId: booking._id,
                pickupLocation: booking.pickupLocation,
                dropoffLocation: booking.dropoffLocation,
                travelDate: booking.travelDate,
            },
            status: "UNREAD",
        })

        return res.status(200).json({
            success: true,
            booking,
            message: "Booking accepted successfully",
        })
    } catch (error) {
        console.error("Error accepting booking:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

// Partner: Reject Booking
export const rejectB2CBooking = async (req, res) => {
    try {
        const partnerId = req.userId
        const { bookingId } = req.params
        const { rejectionReason } = req.body

        const booking = await B2CPassengerBooking.findById(bookingId)

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            })
        }

        if (booking.b2cPartnerId.toString() !== partnerId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            })
        }

        booking.bookingStatus = "REJECTED"
        booking.rejectionReason = rejectionReason || "No reason provided"

        if (booking.paymentStatus === "COMPLETED" && booking.transactionId) {
            try {
                if (booking.paymentMethod === "STRIPE") {
                    // Create refund via Stripe
                    const refund = await stripe.refunds.create({
                        payment_intent: booking.transactionId,
                        reason: "requested_by_customer",
                    })
                    booking.paymentStatus = "REFUNDED"
                    booking.refundId = refund.id
                } else if (booking.paymentMethod === "TAP") {
                    // TAP refund would need to be implemented
                    booking.paymentStatus = "REFUND_PENDING"
                }
            } catch (refundError) {
                console.error("Refund error:", refundError)
                booking.paymentStatus = "REFUND_FAILED"
            }
        }

        await booking.save()

        await Notification.create({
            recipientId: booking.passengerId,
            userId: booking.passengerId,
            type: "BOOKING_REJECTED",
            title: "Booking Rejected",
            message: `Your booking has been rejected. Reason: ${booking.rejectionReason}`,
            data: {
                bookingId: booking._id,
                rejectionReason: booking.rejectionReason,
            },
            status: "UNREAD",
        })

        return res.status(200).json({
            success: true,
            booking,
            message: "Booking rejected successfully",
        })
    } catch (error) {
        console.error("Error rejecting booking:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

export const completeB2CBooking = async (req, res) => {
    try {
        const partnerId = req.userId
        const { bookingId } = req.params

        const booking = await B2CPassengerBooking.findById(bookingId)

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            })
        }

        if (booking.b2cPartnerId.toString() !== partnerId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            })
        }

        if (booking.bookingStatus !== "CONFIRMED") {
            return res.status(400).json({
                success: false,
                message: "Booking must be confirmed before completing",
            })
        }

        booking.bookingStatus = "COMPLETED"
        booking.completedAt = new Date()
        await booking.save()

        // Process wallet payment
        let driverWallet = await Wallet.findOne({ userId: booking.b2cPartnerId })
        if (!driverWallet) {
            driverWallet = new Wallet({
                userId: booking.b2cPartnerId,
                balance: 0,
                totalEarnings: 0,
                totalWithdrawals: 0,
            })
        }

        if (booking.paymentMethod === "CASH") {
            // For cash payment, driver already has the money
            // Deduct admin commission from wallet
            const commissionData = calculateCommission(booking.paymentAmount)
            driverWallet.balance -= commissionData.adminCommission
            driverWallet.totalEarnings += commissionData.fleetOwnerAmount

            // Create transaction record for commission deduction
            if (!driverWallet.transactions) driverWallet.transactions = []
            driverWallet.transactions.push({
                type: "COMMISSION_DEDUCTION",
                amount: commissionData.adminCommission,
                description: `Admin commission (${ADMIN_COMMISSION_PERCENTAGE}%) for booking ${booking._id}`,
                date: new Date(),
                bookingId: booking._id,
            })
        } else {
            // For card payments, add driver earnings to wallet
            driverWallet.balance += booking.driverEarnings
            driverWallet.totalEarnings += booking.driverEarnings

            if (!driverWallet.transactions) driverWallet.transactions = []
            driverWallet.transactions.push({
                type: "BOOKING_EARNING",
                amount: booking.driverEarnings,
                description: `Earnings from booking ${booking._id}`,
                date: new Date(),
                bookingId: booking._id,
            })
        }

        await driverWallet.save()

        // Notify passenger
        await Notification.create({
            recipientId: booking.passengerId,
            userId: booking.passengerId,
            type: "RIDE_COMPLETED",
            title: "Ride Completed",
            message: "Your ride has been completed. Please rate your experience!",
            data: {
                bookingId: booking._id,
            },
            status: "UNREAD",
        })

        return res.status(200).json({
            success: true,
            booking,
            message: "Booking completed successfully",
        })
    } catch (error) {
        console.error("Error completing booking:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

// Get passenger bookings
// export const getPassengerBookings = async (req, res) => {
//     try {
//         const passengerId = req.userId
//         const { status, type = "all" } = req.query

//         const query = { passengerId }

//         if (status) {
//             query.bookingStatus = status
//         }

//         let bookings = []

//         if (type === "all" || type === "b2c") {
//             const b2cBookings = await B2CPassengerBooking.find(query)
//                 .populate("partnerId", "fullName companyLogo whatsappNumber")
//                 .populate("b2cPartnerId", "fullName companyLogo whatsappNumber")
//                 .sort({ createdAt: -1 })

//             bookings = [...bookings, ...b2cBookings.map((b) => ({ ...b.toObject(), type: "B2C" }))]
//         }

//         if (type === "all" || type === "corporate") {
//             const corporateBookings = await CorporateBooking.find(query)
//                 .populate("corporateOwnerId", "companyName companyLogo")
//                 .populate("routeId", "fromLocation toLocation")
//                 .sort({ createdAt: -1 })

//             bookings = [...bookings, ...corporateBookings.map((b) => ({ ...b.toObject(), type: "CORPORATE" }))]
//         }

//         // Sort all bookings by date
//         bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

//         return res.status(200).json({
//             success: true,
//             bookings,
//             totalBookings: bookings.length,
//         })
//     } catch (error) {
//         console.error("Error fetching passenger bookings:", error)
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         })
//     }
// }

// Get passenger bookings
export const getPassengerBookings = async (req, res) => {
    try {
        const passengerId = req.userId
        const { status } = req.query

        const user = await User.findById(passengerId)
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            })
        }

        let bookings = []

        if (user.companyId) {
            const query = { passengerId, corporateOwnerId: user.companyId }
            if (status) query.bookingStatus = status

            const corporateBookings = await CorporateBooking.find(query)
                .populate("corporateOwnerId", "companyName companyLogo")
                .populate("routeId", "fromLocation toLocation departureTime totalSeats availableSeats")
                .sort({ createdAt: -1 })

            bookings = corporateBookings.map((b) => ({
                ...b.toObject(),
                type: "CORPORATE",
                userType: "CORPORATE_EMPLOYEE",
            }))
        } else {
            const query = { passengerId }
            if (status) query.bookingStatus = status

            const b2cBookings = await B2CPassengerBooking.find(query)
                .populate("b2cPartnerId", "fullName companyLogo whatsappNumber driverName vehicleModel vehiclePlate")
                .sort({ createdAt: -1 })

            bookings = b2cBookings.map((b) => ({
                ...b.toObject(),
                type: "B2C",
                userType: "NORMAL_PASSENGER",
            }))
        }

        return res.status(200).json({
            success: true,
            bookings,
            totalBookings: bookings.length,
            userType: user.companyId ? "CORPORATE_EMPLOYEE" : "NORMAL_PASSENGER",
        })
    } catch (error) {
        console.error("Error fetching passenger bookings:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}


// Get partner bookings
export const getPartnerBookings = async (req, res) => {
    try {
        const partnerId = req.userId
        const { status } = req.query

        const query = { b2cPartnerId: partnerId }

        if (status) {
            query.bookingStatus = status
        }

        const bookings = await B2CPassengerBooking.find(query)
            .populate("passengerId", "fullName whatsappNumber email")
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            bookings,
            totalBookings: bookings.length,
        })
    } catch (error) {
        console.error("Error fetching partner bookings:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

export const getCorporateOwnerBookings = async (req, res) => {
    try {
        const corporateOwnerId = req.userId
        const { status, date } = req.query

        const query = { corporateOwnerId }

        if (status) {
            query.bookingStatus = status
        }

        if (date) {
            const dateObj = new Date(date)
            query.travelDate = {
                $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
                $lt: new Date(dateObj.setHours(23, 59, 59, 999)),
            }
        }

        const bookings = await CorporateBooking.find(query)
            .populate("passengerId", "fullName whatsappNumber email")
            .populate("routeId", "fromLocation toLocation departureTime")
            .sort({ travelDate: -1, createdAt: -1 })

        return res.status(200).json({
            success: true,
            bookings,
            totalBookings: bookings.length,
        })
    } catch (error) {
        console.error("Error fetching corporate owner bookings:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

// Verify booking payment (Stripe)
export const verifyBookingPayment = async (req, res) => {
    try {
        const { sessionId, bookingId } = req.body

        const session = await stripe.checkout.sessions.retrieve(sessionId)

        if (session.payment_status === "paid") {
            const booking = await B2CPassengerBooking.findById(bookingId || session.metadata?.bookingId)

            if (booking) {
                booking.paymentStatus = "COMPLETED"
                booking.transactionId = session.payment_intent
                await booking.save()

                // Notify partner about confirmed booking
                await Notification.create({
                    recipientId: booking.b2cPartnerId,
                    userId: booking.b2cPartnerId,
                    type: "NEW_BOOKING",
                    title: "New Paid Booking",
                    message: `Payment received for booking. Amount: AED ${booking.paymentAmount}`,
                    data: {
                        bookingId: booking._id,
                        paymentAmount: booking.paymentAmount,
                    },
                    status: "UNREAD",
                })

                return res.status(200).json({
                    success: true,
                    booking,
                    message: "Payment verified successfully",
                })
            }
        }

        return res.status(400).json({
            success: false,
            message: "Payment not completed",
        })
    } catch (error) {
        console.error("Error verifying booking payment:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}

export const handleTapWebhook = async (req, res) => {
    try {
        const { id, status, metadata } = req.body

        if (!metadata?.bookingId) {
            return res.status(400).json({ success: false, message: "Invalid webhook data" })
        }

        const booking = await B2CPassengerBooking.findById(metadata.bookingId)
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" })
        }

        if (status === "CAPTURED") {
            booking.paymentStatus = "COMPLETED"
            booking.transactionId = id
            await booking.save()

            await Notification.create({
                recipientId: booking.b2cPartnerId,
                userId: booking.b2cPartnerId,
                type: "NEW_BOOKING",
                title: "New Paid Booking",
                message: `Payment received via Tap. Amount: AED ${booking.paymentAmount}`,
                data: {
                    bookingId: booking._id,
                    paymentAmount: booking.paymentAmount,
                },
                status: "UNREAD",
            })
        } else if (status === "FAILED" || status === "DECLINED") {
            booking.paymentStatus = "FAILED"
            booking.bookingStatus = "CANCELLED"
            await booking.save()
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error("TAP webhook error:", error)
        return res.status(500).json({ success: false, message: "Webhook processing failed" })
    }
}

export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"]
    let event

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
        console.error("Stripe webhook signature verification failed:", err.message)
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object

        if (session.metadata?.type === "B2C_BOOKING") {
            const booking = await B2CPassengerBooking.findById(session.metadata.bookingId)
            if (booking) {
                booking.paymentStatus = "COMPLETED"
                booking.transactionId = session.payment_intent
                await booking.save()

                await Notification.create({
                    recipientId: booking.b2cPartnerId,
                    userId: booking.b2cPartnerId,
                    type: "NEW_BOOKING",
                    title: "New Paid Booking",
                    message: `Payment received via Stripe. Amount: AED ${booking.paymentAmount}`,
                    data: {
                        bookingId: booking._id,
                        paymentAmount: booking.paymentAmount,
                    },
                    status: "UNREAD",
                })
            }
        }
    }

    res.json({ received: true })
}

export const getAvailableSeats = async (req, res) => {
    try {
        const { routeId, date } = req.query

        if (!routeId || !date) {
            return res.status(400).json({
                success: false,
                message: "Route ID and date are required",
            })
        }

        const route = await Route.findById(routeId)
        if (!route) {
            return res.status(404).json({
                success: false,
                message: "Route not found",
            })
        }

        const dateObj = new Date(date)
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0))
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999))

        const b2cBookedSeats = await B2CPassengerBooking.aggregate([
            {
                $match: {
                    routeId: route._id,
                    travelDate: { $gte: startOfDay, $lt: endOfDay },
                    bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
                },
            },
            { $group: { _id: null, totalSeats: { $sum: "$numberOfSeats" } } },
        ])

        const corporateBookedSeats = await CorporateBooking.aggregate([
            {
                $match: {
                    routeId: route._id,
                    travelDate: { $gte: startOfDay, $lt: endOfDay },
                    bookingStatus: "CONFIRMED",
                },
            },
            { $group: { _id: null, totalSeats: { $sum: "$numberOfSeats" } } },
        ])

        const totalBooked = (b2cBookedSeats[0]?.totalSeats || 0) + (corporateBookedSeats[0]?.totalSeats || 0)
        const totalSeats = route.totalSeats || route.availableSeats || 0
        const availableSeats = Math.max(0, totalSeats - totalBooked)

        return res.status(200).json({
            success: true,
            totalSeats,
            bookedSeats: totalBooked,
            availableSeats,
            date,
        })
    } catch (error) {
        console.error("Error getting available seats:", error)
        return res.status(500).json({
            success: false,
            message: "Server error",
        })
    }
}
