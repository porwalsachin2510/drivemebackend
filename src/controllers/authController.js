import User from "../models/User.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { uploadToCloudinary } from "../Config/Cloudinary.js"

const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE })
}

export const register = async (req, res) => {
    try {
        const {
            role,
            fullName,
            email,
            whatsappNumber,
            password,
            companyName,
            companyAddress,
            routeListings,
            fleetManagement,
            acceptedPaymentMethods,
        } = req.body

        console.log("[v0] Register request:", { role, fullName, email })

        // Validation
        if (!role || !fullName || !email || !whatsappNumber || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            })
        }

        const validRoles = ["COMMUTER", "CORPORATE", "B2C_PARTNER", "B2B_PARTNER"]
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role",
            })
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            })
        }

        // Hash password
        // const hashedPassword = await bcrypt.hash(password, 10)

        const userData = {
            role,
            fullName,
            email,
            whatsappNumber,
            password,
        }

        if (role === "COMMUTER") {
            // Check if there's a CORPORATE user whose companyName matches this COMMUTER's fullName
            // Using case-insensitive regex for matching and optimized query with lean()
            const matchingCorporateUser = await User.findOne({
                role: "CORPORATE",
                companyName: { $regex: new RegExp(`^${fullName.trim()}$`, "i") },
            })
                .select("companyName") // Only select the companyName field for optimization
                .lean() // Return plain JavaScript object for better performance
                .exec()

            if (matchingCorporateUser) {
                // COMMUTER is an employee of the company
                userData.companyName = matchingCorporateUser.companyName
                userData.companyId = matchingCorporateUser._id
                console.log("[v0] COMMUTER matched with company:", matchingCorporateUser.companyName)
            } else {
                // COMMUTER is not associated with any company
                userData.companyName = null
                console.log("[v0] COMMUTER not associated with any company")
            }
        }

        if (role === "CORPORATE") {
            userData.companyName = companyName || null
            userData.companyAddress = companyAddress || null

            // Upload trade license to Cloudinary
            if (req.files?.tradeLicense) {
                try {
                    const uploadResult = await uploadToCloudinary(req.files.tradeLicense[0], "tradeLicenses")
                    userData.tradeLicense = uploadResult.secure_url
                } catch (uploadError) {
                    console.error("[v0] Cloudinary upload error:", uploadError)
                    return res.status(400).json({
                        success: false,
                        message: "Failed to upload trade license",
                    })
                }
            }
        }

        if (req.files?.companyLogo) {
            const logo = await uploadToCloudinary(req.files.companyLogo[0], "companyLogos");
            userData.companyLogo = logo.secure_url;
        }

        if (role === "B2C_PARTNER") {
            const parsedRoutes = JSON.parse(routeListings || "[]")
            const processedRoutes = []

            for (let i = 0; i < parsedRoutes.length; i++) {
                const route = parsedRoutes[i]
                const routeData = {
                    fromLocation: route.fromLocation,
                    toLocation: route.toLocation,
                    stops: route.stopPoints || [],
                    inboundStart: route.inboundStart,
                    routeStartDate: route.routeStartDate,
                    oneWayPrice: Number.parseFloat(route.oneWayPrice),
                    roundTripPrice: Number.parseFloat(route.roundTripPrice),
                    monthlyPrice: Number(route.monthlyPrice),
                    totalSeats: Number.parseInt(route.totalSeats),
                    availableSeats: Number.parseInt(route.availableSeats),
                    availableDays: route.availableDays,
                    driverName: route.driverName,
                    nationality: route.nationality,
                    licenseNumber: route.licenseNumber,
                    experience: Number.parseInt(route.experience),
                    vehicleModel: route.vehicleModel,
                    vehiclePlate: route.vehiclePlate,
                    images: [],
                }

                // Upload route images to Cloudinary
                const routeImages = req.files?.[`routeImages_${i}`] || []
                for (const imageFile of routeImages) {
                    try {
                        const uploadResult = await uploadToCloudinary(imageFile, `routeListings/${email}/${i}`)
                        routeData.images.push(uploadResult.secure_url)
                    } catch (uploadError) {
                        console.error("[v0] Cloudinary route image upload error:", uploadError)
                    }
                }

                // Driver image (single)
                const driverImg = req.files[`driverImage_${i}`]?.[0];
                if (driverImg) {
                    const uploaded = await uploadToCloudinary(driverImg, `drivers/${email}`);
                    routeData.driverImage = uploaded.secure_url;
                }

                processedRoutes.push(routeData)
            }

            // Company logo
            // if (req.files?.companyLogo?.[0]) {
            //     const uploaded = await uploadToCloudinary(
            //         req.files.companyLogo[0],
            //         "companyLogos"
            //     );
            //     userData.companyLogo = uploaded.secure_url;
            // }

            userData.routeListings = processedRoutes
            userData.acceptedPaymentMethods = JSON.parse(acceptedPaymentMethods || "[]")
        }

        // if (role === "B2B_PARTNER") {
        //     const parsedFleet = JSON.parse(fleetManagement || "[]")
        //     const processedFleet = []

        //     for (let i = 0; i < parsedFleet.length; i++) {
        //         const vehicle = parsedFleet[i]
        //         const vehicleData = {
        //             vehicleType: vehicle.vehicleType,
        //             model: vehicle.model,
        //             year: Number.parseInt(vehicle.year),
        //             seatingCapacity: Number.parseInt(vehicle.seatingCapacity),
        //             quantityAvailable: Number.parseInt(vehicle.quantityAvailable),
        //             images: [],
        //         }

        //         // Upload vehicle images to Cloudinary
        //         const vehicleImages = req.files?.[`fleetImages_${i}`] || []
        //         for (const imageFile of vehicleImages) {
        //             try {
        //                 const uploadResult = await uploadToCloudinary(imageFile, `fleetManagement/${email}/${i}`)
        //                 vehicleData.images.push(uploadResult.secure_url)
        //             } catch (uploadError) {
        //                 console.error("[v0] Cloudinary fleet image upload error:", uploadError)
        //             }
        //         }

        //         processedFleet.push(vehicleData)
        //     }

        //     userData.fleetManagement = processedFleet
        //     userData.acceptedPaymentMethods = JSON.parse(acceptedPaymentMethods || "[]")
        // }

        // Create new user
        
        if (role === "B2B_PARTNER") {
            userData.fleetManagement = []
            userData.acceptedPaymentMethods = JSON.parse(acceptedPaymentMethods || "[]")
        }
        
        const newUser = new User(userData)
        await newUser.save()

        console.log("[v0] User created successfully:", newUser._id)

        // Generate token
        const token = generateToken(newUser._id, newUser.role)

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                _id: newUser._id,
                role: newUser.role,
                fullName: newUser.fullName,
                email: newUser.email,
                whatsappNumber: newUser.whatsappNumber,
            },
        })
    } catch (error) {
        console.error("[v0] Register error:", error)
        res.status(500).json({
            success: false,
            message: error.message || "Registration failed",
        })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        console.log("request body", req.body);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            })
        }

        const isPasswordValid = await user.comparePassword(password);

        console.log("isPasswordValid", isPasswordValid)

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid Password credentials",
            })
        }

        const token = generateToken(user._id, user.role)

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: user.toJSON(),
        })
    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}

export const logout = (req, res) => {
    try {
        // The verifyToken middleware ensures this, so we can proceed safely
        const userId = req.userId // Set by verifyToken middleware

        // Clear the authentication cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        })

        // Clear any other session-related cookies if they exist
        res.clearCookie("session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        })

        res.status(200).json({
            success: true,
            message: "Logout successful",
            userId, // Confirm which user logged out
        })
    } catch (error) {
        console.error("Logout error:", error)
        res.status(500).json({
            success: false,
            message: error.message || "Logout failed",
        })
    }
}