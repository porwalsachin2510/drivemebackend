// START: NEW ROUTE FILE FOR COMMUTE SEARCH
import express from "express"
import { verifyToken } from "../middleware/auth.js"
import { checkCommuterRole } from "../middleware/auth.js"
import { searchCommuteRoutes } from "../controllers/commuteSearchController.js"

const router = express.Router()

// ROUTE: GET /api/commute/search
// DESCRIPTION: SEARCH COMMUTE ROUTES FOR COMMUTERS
// ACCESS: PROTECTED - COMMUTER ROLE ONLY
router.get(
    "/search",
    verifyToken, // FIRST: AUTHENTICATE USER
    checkCommuterRole, // SECOND: CHECK IF USER IS COMMUTER
    searchCommuteRoutes, // THIRD: EXECUTE CONTROLLER
)

export default router
// END: NEW ROUTE FILE FOR COMMUTE SEARCH
