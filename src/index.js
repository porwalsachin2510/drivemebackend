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

dotenv.config()

const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    }),
)

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
