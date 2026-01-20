import Driver from "../models/Driver.js"
import CorporateDriver from "../models/CorporateDriver.js"
import { uploadToCloudinary } from "../Config/Cloudinary.js"

export const createDriver = async (req, res) => {
    try {
        console.log("[v0] Creating driver with fleetOwnerId:", req.userId)
        console.log("[v0] Request body:", JSON.stringify(req.body, null, 2))
        console.log("[v0] Files received:", {
            license: req.files?.license?.length || 0,
            passport: req.files?.passport?.length || 0,
            visa: req.files?.visa?.length || 0,
            medicalCertificate: req.files?.medicalCertificate?.length || 0,
        })

        let experienceYears = req.body.experienceYears || req.body["experience[years]"]
        experienceYears = Number.parseInt(experienceYears, 10)

        if (isNaN(experienceYears) || experienceYears < 0) {
            return res.status(400).json({
                success: false,
                message: "Experience years must be a valid number",
            })
        }

        const driverData = {
            fleetOwnerId: req.userId,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            licenseNumber: req.body.licenseNumber,
            licenseExpiry: req.body.licenseExpiry,
            licenseType: req.body.licenseType,
            dateOfBirth: req.body.dateOfBirth,
            nationality: req.body.nationality,
            address: {
                street: req.body["address[street]"] || req.body.street,
                city: req.body["address[city]"] || req.body.city,
                country: req.body["address[country]"] || req.body.country,
            },
            experience: {
                years: experienceYears,
                description: req.body["experience[description]"] || req.body.experienceDescription,
            },
            documents: {
                license: null,
                passport: null,
                visa: null,
                medicalCertificate: null,
            },
        }

        if (req.files) {
            const fileUploads = []

            if (req.files.license) {
                fileUploads.push({
                    file: req.files.license[0],
                    fieldName: "license",
                })
            }
            if (req.files.passport) {
                fileUploads.push({
                    file: req.files.passport[0],
                    fieldName: "passport",
                })
            }
            if (req.files.visa) {
                fileUploads.push({
                    file: req.files.visa[0],
                    fieldName: "visa",
                })
            }
            if (req.files.medicalCertificate) {
                fileUploads.push({
                    file: req.files.medicalCertificate[0],
                    fieldName: "medicalCertificate",
                })
            }

            if (fileUploads.length > 0) {
                for (const upload of fileUploads) {
                    const uploadedFile = await uploadToCloudinary(upload.file, `driveme/drivers/${req.userId}`, upload.fieldName)
                    driverData.documents[upload.fieldName] = uploadedFile.secure_url
                }
            }
        }

        const driver = await Driver.create(driverData)

        res.status(201).json({
            success: true,
            message: "Driver created successfully",
            driver,
        })
    } catch (error) {
        console.error("[v0] Error creating driver:", error.message)
        res.status(500).json({
            success: false,
            message: "Error creating driver",
            error: error.message,
        })
    }
}

export const getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find().sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            count: drivers.length,
            drivers,
        })
    } catch (error) {
        console.error("[v0] Error fetching all drivers:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching drivers",
            error: error.message,
        })
    }
}

// Get all drivers for fleet owner
export const getFleetOwnerDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find({ fleetOwnerId: req.userId }).sort({
            createdAt: -1,
        })

        res.status(200).json({
            success: true,
            count: drivers.length,
            drivers,
        })
    } catch (error) {
        console.error("[v0] Error fetching drivers:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching drivers",
            error: error.message,
        })
    }
}

// Get available drivers
export const getAvailableDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find({
            fleetOwnerId: req.userId,
            status: "AVAILABLE",
        }).sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            count: drivers.length,
            drivers,
        })
    } catch (error) {
        console.error("[v0] Error fetching available drivers:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching available drivers",
            error: error.message,
        })
    }
}

// Update driver
export const updateDriver = async (req, res) => {
    try {
        const { driverId } = req.params

        const driver = await Driver.findOneAndUpdate({ _id: driverId, fleetOwnerId: req.userId }, req.body, {
            new: true,
            runValidators: true,
        })

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found",
            })
        }

        res.status(200).json({
            success: true,
            message: "Driver updated successfully",
            driver,
        })
    } catch (error) {
        console.error("[v0] Error updating driver:", error)
        res.status(500).json({
            success: false,
            message: "Error updating driver",
            error: error.message,
        })
    }
}

// Delete driver
export const deleteDriver = async (req, res) => {
    try {
        const { driverId } = req.params

        const driver = await Driver.findOne({
            _id: driverId,
            fleetOwnerId: req.userId,
        })

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found",
            })
        }

        if (driver.status === "ASSIGNED") {
            return res.status(400).json({
                success: false,
                message: "Cannot delete assigned driver",
            })
        }

        await driver.deleteOne()

        res.status(200).json({
            success: true,
            message: "Driver deleted successfully",
        })
    } catch (error) {
        console.error("[v0] Error deleting driver:", error)
        res.status(500).json({
            success: false,
            message: "Error deleting driver",
            error: error.message,
        })
    }
}

export const createCorporateDriver = async (req, res) => {
    try {
        console.log("[v0] Creating driver with corporateOwnerId:", req.userId)
        console.log("[v0] Request body:", JSON.stringify(req.body, null, 2))
        console.log("[v0] Files received:", {
            license: req.files?.license?.length || 0,
            passport: req.files?.passport?.length || 0,
            visa: req.files?.visa?.length || 0,
            medicalCertificate: req.files?.medicalCertificate?.length || 0,
        })

        let experienceYears = req.body.experienceYears || req.body["experience[years]"]
        experienceYears = Number.parseInt(experienceYears, 10)

        if (isNaN(experienceYears) || experienceYears < 0) {
            return res.status(400).json({
                success: false,
                message: "Experience years must be a valid number",
            })
        }

        const driverData = {
            corporateOwnerId: req.userId,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            licenseNumber: req.body.licenseNumber,
            licenseExpiry: req.body.licenseExpiry,
            licenseType: req.body.licenseType,
            dateOfBirth: req.body.dateOfBirth,
            nationality: req.body.nationality,
            address: {
                street: req.body["address[street]"] || req.body.street,
                city: req.body["address[city]"] || req.body.city,
                country: req.body["address[country]"] || req.body.country,
            },
            experience: {
                years: experienceYears,
                description: req.body["experience[description]"] || req.body.experienceDescription,
            },
            documents: {
                license: null,
                passport: null,
                visa: null,
                medicalCertificate: null,
            },
        }

        if (req.files) {
            const fileUploads = []

            if (req.files.license) {
                fileUploads.push({
                    file: req.files.license[0],
                    fieldName: "license",
                })
            }
            if (req.files.passport) {
                fileUploads.push({
                    file: req.files.passport[0],
                    fieldName: "passport",
                })
            }
            if (req.files.visa) {
                fileUploads.push({
                    file: req.files.visa[0],
                    fieldName: "visa",
                })
            }
            if (req.files.medicalCertificate) {
                fileUploads.push({
                    file: req.files.medicalCertificate[0],
                    fieldName: "medicalCertificate",
                })
            }

            if (fileUploads.length > 0) {
                for (const upload of fileUploads) {
                    const uploadedFile = await uploadToCloudinary(upload.file, `driveme/drivers/${req.userId}`, upload.fieldName)
                    driverData.documents[upload.fieldName] = uploadedFile.secure_url
                }
            }
        }

        const driver = await CorporateDriver.create(driverData)

        res.status(201).json({
            success: true,
            message: "Driver created successfully",
            driver,
        })
    } catch (error) {
        console.error("[v0] Error creating driver:", error.message)
        res.status(500).json({
            success: false,
            message: "Error creating driver",
            error: error.message,
        })
    }
}

// Get available drivers
export const getAvailableCorporateDrivers = async (req, res) => {
    try {
        const drivers = await CorporateDriver.find({
            corporateOwnerId: req.userId,
            status: "AVAILABLE",
        }).sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            count: drivers.length,
            drivers,
        })
    } catch (error) {
        console.error("[v0] Error fetching available drivers:", error)
        res.status(500).json({
            success: false,
            message: "Error fetching available drivers",
            error: error.message,
        })
    }
}