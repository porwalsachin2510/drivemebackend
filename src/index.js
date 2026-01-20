import express from "express"
import mongoose from "mongoose"
import cookieParser from "cookie-parser"
import cors from "cors"
import dotenv from "dotenv"
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

dotenv.config()

const app = express()

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
app.use("/api", walletRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/vehicle-assignments", vehicleAssignmentRoutes)
app.use("/api/b2b/drivers", driverRoutes)
app.use("/api/payment-schedules", paymentScheduleRoutes)
app.use("/api/bookings", bookingRoutes)
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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
