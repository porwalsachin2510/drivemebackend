import User from "../models/User.js"
import Vehicle from "../models/Vehicle.js"

/* ======================================================
   UTILITY FUNCTIONS
====================================================== */

const normalize = (val) => {
    if (typeof val === "string") return val.toLowerCase().trim()
    if (val?.location && typeof val.location === "string") {
        return val.location.toLowerCase().trim()
    }
    return ""
}

// Check location match (from / to / stops)
const isLocationMatch = (searchLocation, from, to, stops = []) => {
    if (!searchLocation) return true
    const search = normalize(searchLocation)

    if (from && normalize(from).includes(search)) return true
    if (to && normalize(to).includes(search)) return true

    return stops.some((stop) => {
        const stopLocation = typeof stop === "string" ? stop : stop.location
        return normalize(stopLocation).includes(search)
    })
}

// Build ordered route path with times
const buildFullPathWithTimes = (from, stops = [], to, inboundStart) => {
    const path = []

    // Add fromLocation with inboundStart time
    path.push({
        location: from,
        time: inboundStart || "N/A",
        isFromLocation: true,
    })

    // Add stops with their times
    if (stops && stops.length > 0) {
        stops.forEach((stop) => {
            if (typeof stop === "string") {
                path.push({ location: stop, time: "N/A", isStop: true })
            } else {
                path.push({
                    location: stop.location || stop,
                    time: stop.time || "N/A",
                    isStop: true,
                })
            }
        })
    }

    // Add toLocation (usually arrival time would be calculated)
    path.push({
        location: to,
        time: "N/A", // Can be calculated if needed
        isToLocation: true,
    })

    return path
}

// Find index of searched location in path
const findLocationIndex = (path = [], location) => {
    if (!location) return -1
    const search = normalize(location)
    return path.findIndex((p) => normalize(p.location).includes(search))
}

// Get arrival time for pickup/dropoff location
const getArrivalTime = (path, locationIndex) => {
    if (locationIndex >= 0 && locationIndex < path.length) {
        return path[locationIndex].time || "N/A"
    }
    return "N/A"
}

// Match selected days with available days
const matchDays = (selectedDays = [], availableDays = []) => {
    if (!selectedDays || selectedDays.length === 0) {
        return {
            allAvailable: true,
            matchedDays: availableDays,
            notAvailableDays: [],
        }
    }

    const normalizedSelectedDays = selectedDays.map((day) => day.toUpperCase())
    const normalizedAvailableDays = availableDays.map((day) => day.toUpperCase())

    const matchedDays = normalizedSelectedDays.filter((day) => normalizedAvailableDays.includes(day))

    const notAvailableDays = normalizedSelectedDays.filter((day) => !normalizedAvailableDays.includes(day))

    return {
        allAvailable: notAvailableDays.length === 0,
        matchedDays: matchedDays,
        notAvailableDays: notAvailableDays,
    }
}

// Decide full route OR trimmed route with arrival times
const getTravelPath = ({
    from,
    to,
    stops,
    inboundStart,
    pickupLocation,
    dropoffLocation,
    selectedDays,
    availableDays,
}) => {
    const fullPath = buildFullPathWithTimes(from, stops, to, inboundStart)

    // Match days
    const dayMatching = matchDays(selectedDays, availableDays)

    // 🔹 No search → full route
    if (!pickupLocation && !dropoffLocation) {
        return {
            fromLocation: from,
            toLocation: to,
            travelPath: fullPath,
            pickupArrivalTime: fullPath[0].time,
            dropoffArrivalTime: fullPath[fullPath.length - 1].time,
            dayMatching,
        }
    }

    const pickupIndex = pickupLocation ? findLocationIndex(fullPath, pickupLocation) : 0

    const dropIndex = dropoffLocation ? findLocationIndex(fullPath, dropoffLocation) : fullPath.length - 1

    if (pickupIndex === -1 || dropIndex === -1) return null
    if (pickupIndex >= dropIndex) return null

    const slicedPath = fullPath.slice(pickupIndex, dropIndex + 1)

    return {
        fromLocation: slicedPath[0].location,
        toLocation: slicedPath[slicedPath.length - 1].location,
        travelPath: slicedPath,
        pickupArrivalTime: getArrivalTime(fullPath, pickupIndex),
        dropoffArrivalTime: getArrivalTime(fullPath, dropIndex),
        dayMatching,
    }
}

/* ======================================================
   MAIN CONTROLLER
====================================================== */

export const searchCommuteRoutes = async (req, res) => {
    try {
        const userId = req.userId

        const {
            pickupLocation,
            dropoffLocation,
            filterType, // all | matched
            selectedDays, // User selected days
            nationality, // Added nationality parameter for location-based filtering
        } = req.query

        // Parse selectedDays if it's a string
        let parsedSelectedDays = []
        if (selectedDays) {
            try {
                parsedSelectedDays = typeof selectedDays === "string" ? JSON.parse(selectedDays) : selectedDays
            } catch (e) {
                console.log("Error parsing selectedDays:", e)
            }
        }

        const user = await User.findById(userId).select("companyId role")

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            })
        }

        const routes = []

        /* ======================================================
               COMPANY COMMUTER ROUTES
            ====================================================== */
        if (user.companyId) {
            const company = await User.findById(user.companyId).select("companyName contractedVehicles companyLogo")

            const vehicles = await Vehicle.find({
                _id: { $in: company.contractedVehicles },
                active: true,
            })

            for (const vehicle of vehicles) {
                for (const route of vehicle.routes || []) {
                    if (!route.active) continue

                    if (!route.availableSeats || route.availableSeats <= 0) continue

                    if (nationality && route.nationality && route.nationality.toLowerCase() !== nationality.toLowerCase()) {
                        continue
                    }

                    let shouldInclude = false

                    if (filterType === "matched" && (pickupLocation || dropoffLocation)) {
                        const pickupMatch = isLocationMatch(pickupLocation, route.fromLocation, route.toLocation, route.stops)
                        const dropMatch = isLocationMatch(dropoffLocation, route.fromLocation, route.toLocation, route.stops)
                        shouldInclude = pickupMatch && dropMatch
                    } else {
                        shouldInclude = true
                    }

                    if (!shouldInclude) continue

                    const travelData = getTravelPath({
                        from: route.fromLocation,
                        to: route.toLocation,
                        stops: route.stops || [],
                        inboundStart: route.departureTime,
                        pickupLocation,
                        dropoffLocation,
                        selectedDays: parsedSelectedDays,
                        availableDays: route.daysOfWeek || [],
                    })

                    if (!travelData) continue

                    routes.push({
                        routeId: route._id,
                        company: company.companyName,
                        companyLogo: company.companyLogo || null, // Added companyLogo
                        vehicleType: vehicle.vehicleType,
                        vehicleModel: vehicle.vehicleModel,
                        vehiclePlate: vehicle.vehiclePlate,

                        fromLocation: travelData.fromLocation,
                        toLocation: travelData.toLocation,
                        travelPath: travelData.travelPath,

                        pickupArrivalTime: travelData.pickupArrivalTime,
                        dropoffArrivalTime: travelData.dropoffArrivalTime,

                        departureTime: route.departureTime,
                        startDate: route.routeStartDate,
                        monthlyPrice: route.monthlyPrice,
                        availableSeats: route.availableSeats,

                        daysOfWeek: route.daysOfWeek || [],
                        dayMatching: travelData.dayMatching,

                        driverName: vehicle.driverName,
                        images: vehicle.images || [],
                        type: "company",
                    })
                }
            }

            return res.status(200).json({
                success: true,
                userType: "company",
                totalRoutes: routes.length,
                routes,
            })
        }

        /* ======================================================
               NORMAL / B2C COMMUTER ROUTES
            ====================================================== */
        const partners = await User.find({
            role: "B2C_PARTNER",
            "routeListings.0": { $exists: true },
        }).select("fullName routeListings companyLogo") // Added companyLogo to select

        for (const partner of partners) {
            for (const route of partner.routeListings || []) {
                if (!route.availableSeats || route.availableSeats <= 0) continue

                if (nationality && route.nationality && route.nationality.toLowerCase() !== nationality.toLowerCase()) {
                    continue
                }

                let shouldInclude = false

                if (filterType === "matched" && (pickupLocation || dropoffLocation)) {
                    const pickupMatch = isLocationMatch(pickupLocation, route.fromLocation, route.toLocation, route.stops)
                    const dropMatch = isLocationMatch(dropoffLocation, route.fromLocation, route.toLocation, route.stops)
                    shouldInclude = pickupMatch && dropMatch
                } else {
                    shouldInclude = true
                }

                if (!shouldInclude) continue

                const travelData = getTravelPath({
                    from: route.fromLocation,
                    to: route.toLocation,
                    stops: route.stops || [],
                    inboundStart: route.inboundStart,
                    pickupLocation,
                    dropoffLocation,
                    selectedDays: parsedSelectedDays,
                    availableDays: route.availableDays || [],
                })

                if (!travelData) continue

                routes.push({
                    routeId: route._id,
                    operator: partner.fullName,
                    companyLogo: partner.companyLogo || null, // Added companyLogo

                    fromLocation: travelData.fromLocation,
                    toLocation: travelData.toLocation,
                    travelPath: travelData.travelPath,

                    pickupArrivalTime: travelData.pickupArrivalTime,
                    dropoffArrivalTime: travelData.dropoffArrivalTime,

                    departureTime: route.inboundStart,
                    startDate: route.routeStartDate,
                    roundTripPrice: route.roundTripPrice,
                    oneWayPrice: route.oneWayPrice,
                    monthlyPrice: route.monthlyPrice,
                    availableSeats: route.availableSeats,
                    totalSeats: route.totalSeats,

                    availableDays: route.availableDays || [],
                    dayMatching: travelData.dayMatching,

                    driverName: route.driverName,
                    vehicleModel: route.vehicleModel,
                    vehiclePlate: route.vehiclePlate,
                    images: route.images || [],
                    type: "b2c",
                })
            }
        }

        return res.status(200).json({
            success: true,
            userType: "normal",
            totalRoutes: routes.length,
            routes,
        })
    } catch (error) {
        console.error("searchCommuteRoutes error:", error)
        return res.status(500).json({
            success: false,
            message: "Server error while searching routes",
        })
    }
}
