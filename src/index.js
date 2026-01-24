// import express from "express"
// import mongoose from "mongoose"
// import cookieParser from "cookie-parser"
// import cors from "cors"
// import dotenv from "dotenv"
// import authRoutes from "./routes/auth.js"
// import userRoutes from "./routes/users.js"
// import commuteRoutes from "./routes/commuteRoutes.js"
// import locationRoutes from "./routes/locationRoutes.js"
// import vehicleRoutes from "./routes/vehicleRoutes.js"
// import quotationRoutes from "./routes/quotationRoutes.js"
// import contractsRoutes from "./routes/contractRoutes.js"
// import paymentRoutes from "./routes/paymentRoutes.js"
// import driverRoutes from "./routes/driverRoutes.js"
// import paymentScheduleRoutes from "./routes/paymentScheduleRoutes.js"
// import walletRoutes from "./routes/walletRoutes.js"
// import adminRoutes from "./routes/adminRoutes.js"
// import vehicleAssignmentRoutes from "./routes/vehicleAssignmentRoutes.js"
// import bookingRoutes from "./routes/bookingRoutes.js"

// dotenv.config()

// const app = express()

// app.use(
//     cors({
//         origin: true,
//         credentials: true
//     })
// );

// app.options("*", cors());

// // Middleware
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use(cookieParser())


// // Database Connection
// mongoose
//     .connect(process.env.MONGODB_URI)
//     .then(() => console.log("MongoDB connected successfully"))
//     .catch((err) => console.log("MongoDB connection error:", err))

// // Routes
// app.use("/api/auth", authRoutes)
// app.use("/api/users", userRoutes)
// app.use("/api/commute", commuteRoutes)
// app.use("/api/location", locationRoutes)
// app.use("/api/vehicles", vehicleRoutes)
// app.use("/api/quotations", quotationRoutes)
// app.use("/api/contracts", contractsRoutes)
// app.use("/api/payments", paymentRoutes)
// app.use("/api", walletRoutes)
// app.use("/api/admin", adminRoutes)
// app.use("/api/vehicle-assignments", vehicleAssignmentRoutes)
// app.use("/api/b2b/drivers", driverRoutes)
// app.use("/api/payment-schedules", paymentScheduleRoutes)
// app.use("/api/bookings", bookingRoutes)
// app.use("/api/corporate", driverRoutes)

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error(err)
//     res.status(err.status || 500).json({
//         success: false,
//         message: err.message || "Internal Server Error",
//     })
// })

// const PORT = process.env.PORT || 5000
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`)
// })


import express from "express"
import mongoose from "mongoose"
import cookieParser from "cookie-parser"
import cors from "cors"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"
import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import commuteRoutes from "./routes/commuteRoutes.js"
import locationRoutes from "./routes/locationRoutes.js"
import vehicleRoutes from "./routes/vehicleRoutes.js"
import quotationRoutes from "./routes/quotationRoutes.js"
import contractsRoutes from "./routes/contractRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import driverRoutes from "./routes/driverRoutes.js"
import paymentScheduleRoutes from "./routes/paymentScheduleRoutes.js"
import walletRoutes from "./routes/walletRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import vehicleAssignmentRoutes from "./routes/vehicleAssignmentRoutes.js"
import bookingRoutes from "./routes/bookingRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"
import { initializeSocket } from "./Services/socketService.js"

dotenv.config()

const app = express()

// Create HTTP server
const server = createServer(app)

// Create Socket.io server
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
})

// Store active drivers and their locations
const activeDrivers = new Map()
// Store passenger connections
const passengerConnections = new Map()

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // Driver joins their room
    socket.on('join-driver-room', (driverId) => {
        socket.join(`driver-${driverId}`)
        socket.driverId = driverId
        console.log(`Driver ${driverId} joined their room`)
    })

    // Passenger joins booking room
    socket.on('join-booking-room', (bookingId) => {
        socket.join(`booking-${bookingId}`)
        socket.bookingId = bookingId
        console.log(`Passenger joined booking room: ${bookingId}`)
    })

    // Driver updates location
    socket.on('update-location', (locationData) => {
        const { driverId, lat, lng } = locationData

        // Store driver location
        activeDrivers.set(driverId, {
            lat,
            lng,
            lastUpdated: new Date(),
            socketId: socket.id
        })

        // Broadcast to passengers tracking this driver
        socket.broadcast.emit('location-update', {
            driverId,
            lat,
            lng,
            timestamp: new Date()
        })

        // Also emit to specific booking rooms if driver is in active trip
        socket.rooms.forEach(room => {
            if (room.startsWith('booking-')) {
                socket.to(room).emit('location-update', {
                    driverId,
                    lat,
                    lng,
                    timestamp: new Date()
                })
            }
        })

        console.log(`Driver ${driverId} location updated: ${lat}, ${lng}`)
    })

    // Driver accepts booking
    socket.on('accept-booking', (bookingData) => {
        const { bookingId, driverId, passengerId } = bookingData

        // Notify passenger
        io.to(`booking-${bookingId}`).emit('booking-accepted', {
            bookingId,
            driverId,
            message: 'Your booking has been accepted'
        })

        // Start sharing location with passenger
        const driverLocation = activeDrivers.get(driverId)
        if (driverLocation) {
            io.to(`booking-${bookingId}`).emit('location-update', driverLocation)
        }

        console.log(`Driver ${driverId} accepted booking ${bookingId}`)
    })

    // Driver rejects booking
    socket.on('reject-booking', (bookingData) => {
        const { bookingId, driverId, passengerId } = bookingData

        // Notify passenger
        io.to(`booking-${bookingId}`).emit('booking-rejected', {
            bookingId,
            driverId,
            message: 'Your booking has been rejected'
        })

        console.log(`Driver ${driverId} rejected booking ${bookingId}`)
    })

    // Driver starts trip
    socket.on('start-trip', (tripData) => {
        const { bookingId, driverId, passengerId } = tripData

        // Notify passenger
        io.to(`booking-${bookingId}`).emit('trip-started', {
            bookingId,
            driverId,
            message: 'Your trip has started'
        })

        // Start sharing location with passenger
        const driverLocation = activeDrivers.get(driverId)
        if (driverLocation) {
            io.to(`booking-${bookingId}`).emit('location-update', driverLocation)
        }

        console.log(`Driver ${driverId} started trip ${bookingId}`)
    })

    // Driver completes trip
    socket.on('complete-trip', (tripData) => {
        const { bookingId, driverId, passengerId } = tripData

        // Notify passenger
        io.to(`booking-${bookingId}`).emit('trip-completed', {
            bookingId,
            driverId,
            message: 'Your trip has been completed'
        })

        // Stop sharing location
        io.to(`booking-${bookingId}`).emit('stop-location-sharing', {
            bookingId,
            message: 'Trip completed - location sharing stopped'
        })

        console.log(`Driver ${driverId} completed trip ${bookingId}`)
    })

    // Corporate driver specific events
    socket.on('join-corporate-driver-room', (driverId) => {
        socket.join(`corporate-driver-${driverId}`)
        socket.driverId = driverId
        console.log(`Corporate driver ${driverId} joined their room`)
    })

    // Corporate driver starts trip
    socket.on('start-corporate-trip', (tripData) => {
        const { bookingId, driverId, passengerId } = tripData

        // Notify passenger and corporate owner
        io.to(`booking-${bookingId}`).emit('corporate-trip-started', {
            bookingId,
            driverId,
            message: 'Your corporate trip has started'
        })

        console.log(`Corporate driver ${driverId} started trip ${bookingId}`)
    })

    // Get nearby drivers
    socket.on('get-nearby-drivers', (data) => {
        const { passengerLat, passengerLng, radius = 5000 } = data // radius in meters

        const nearbyDrivers = []
        activeDrivers.forEach((location, driverId) => {
            const distance = calculateDistance(
                passengerLat, passengerLng,
                location.lat, location.lng
            )

            if (distance <= radius) {
                nearbyDrivers.push({
                    driverId,
                    lat: location.lat,
                    lng: location.lng,
                    distance: Math.round(distance)
                })
            }
        })

        socket.emit('nearby-drivers', nearbyDrivers)
        console.log(`Found ${nearbyDrivers.length} nearby drivers`)
    })

    // Real-time notifications
    socket.on('join-notification-room', (userId) => {
        socket.join(`notifications-${userId}`)
        socket.userId = userId
        console.log(`User ${userId} joined notification room`)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)

        // Remove driver from active drivers if disconnected
        if (socket.driverId) {
            activeDrivers.delete(socket.driverId)
            console.log(`Driver ${socket.driverId} removed from active drivers`)
        }
    })
})

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}

// Export io instance for use in other files
export { io }

// Initialize socket service
initializeSocket(io)

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.options("*", cors());

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())


// Database Connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.log("MongoDB connection error:", err))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/commute", commuteRoutes)
app.use("/api/location", locationRoutes)
app.use("/api/vehicles", vehicleRoutes)
app.use("/api/quotations", quotationRoutes)
app.use("/api/contracts", contractsRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/wallet", walletRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/vehicle-assignments", vehicleAssignmentRoutes)
app.use("/api/b2b/drivers", driverRoutes)
app.use("/api/payment-schedules", paymentScheduleRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/corporate", driverRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err)
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Socket.io server integrated and ready`)
})
