import User from "../models/User.js"

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password")

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            users,
            total: users.length,
        })
    } catch (error) {
        console.error("Get users error:", error)
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            })
        }

        res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            user: user.toJSON(),
        })
    } catch (error) {
        console.error("Get current user error:", error)
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}
