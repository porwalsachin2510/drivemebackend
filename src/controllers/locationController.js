import axios from "axios";
import User from "../models/User.js";

export const detectUserLocation = async (req, res) => {
    try {

        const userId = req.userId;
        console.log("first userId", userId);


        // Get user's IP from request
        const userIp =
            req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || req.connection.remoteAddress

        // For localhost/development, default to Kuwait
        if (!userIp || userIp === "::1" || userIp === "127.0.0.1" || userIp.includes("192.168")) {

            await User.findOneAndUpdate(
                { _id: userId },
                { $set: { nationality: "Kuwait" } },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                nationality: "Kuwait",
                country: "Kuwait",
                ip: userIp,
                isDevelopment: true,
            })
        }
        try {
            // Use ipapi.co to detect location from backend (no CORS issues)
            const response = await axios.get(`https://ipapi.co/${userIp}/json/`)


            const countryName = response.data.country_name

            let nationality = countryName;

            if (countryName === "Kuwait") {
                nationality = "Kuwait";
            } else if (countryName === "United Arab Emirates") {
                nationality = "UAE";
            }

            // ✅ UPDATE USER NATIONALITY
            await User.findOneAndUpdate(
                { _id: userId },
                { $set: { nationality: nationality } },
                { new: true }
            );

            console.log("userresponse", userres);

            return res.status(200).json({
                success: true,
                nationality,
                country: countryName,
                ip: userIp,
                isDevelopment: false,
            })
        } catch (apiError) {

            // ❌ Location failed → nationality NULL
            await User.findOneAndUpdate(
                { _id: userId },
                { $set: { nationality: null } },
                { new: true }
            );

            console.error("Error calling ipapi.co:", apiError.message)
            // Default to Kuwait if geolocation API fails
            return res.status(200).json({
                success: true,
                nationality: null,
                country: null,
                ip: userIp,
                isDevelopment: false,
                error: "Failed to detect location",
            })
        }
    } catch (error) {
        console.error("detectUserLocation error:", error)
        return res.status(200).json({
            success: true,
            nationality: null,
            country: null,
            error: "Failed to detect location",
        })
    }
}
