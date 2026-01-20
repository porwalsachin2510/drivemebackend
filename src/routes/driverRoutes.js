import express from "express"
import {
    getFleetOwnerDrivers,
    getAvailableDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    getAllDrivers,
    createCorporateDriver,
    getAvailableCorporateDrivers,
} from "../controllers/driverController.js"
import { verifyToken, checkFleetOwnerRole, checkCorporateOwnerRole } from "../middleware/auth.js"
import { uploadDriverDocuments, handleMulterError } from "../Config/multerConfig.js"

const router = express.Router()

router.post("/", verifyToken, checkFleetOwnerRole, uploadDriverDocuments, handleMulterError, createDriver)

router.get("/", verifyToken, checkFleetOwnerRole, getFleetOwnerDrivers)
router.get("/available", verifyToken, checkFleetOwnerRole, getAvailableDrivers)
router.get("/all", verifyToken, getAllDrivers)
router.put("/:driverId", verifyToken, checkFleetOwnerRole, updateDriver)
router.delete("/:driverId", verifyToken, checkFleetOwnerRole, deleteDriver)


router.post("/create-corporate-driver", verifyToken, checkCorporateOwnerRole, uploadDriverDocuments, handleMulterError, createCorporateDriver)
router.get("/available-corporate-driver", verifyToken, checkCorporateOwnerRole, getAvailableCorporateDrivers)

export default router
