import jwt from "jsonwebtoken"

export const verifyToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided",
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.userId
        req.userRole = decoded.role
        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        })
    }
}

// START: NEW MIDDLEWARE TO CHECK COMMUTER ROLE
export const checkCommuterRole = (req, res, next) => {
    // USER ROLE IS ALREADY SET BY verifyToken MIDDLEWARE IN req.userRole
    if (req.userRole !== "COMMUTER") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Only commuters can access this resource.",
        })
    }
    next()
}
// END: NEW MIDDLEWARE TO CHECK COMMUTER ROLE

export const checkFleetOwnerRole = (req, res, next) => {
    if (req.userRole !== "B2B_PARTNER") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Only fleet owners can access this resource.",
        })
    }
    next()
}

export const checkCorporateOwnerRole = (req, res, next) => {
    if (req.userRole !== "CORPORATE") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Only corporate owners can access this resource.",
        })
    }
    next()
}

export const checkAdminRole = (req, res, next) => {
    if (req.userRole !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Only Admin can access this resource.",
        })
    }
    next()
}

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access",
            })
        }
        next()
    }
}
