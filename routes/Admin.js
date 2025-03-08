const express = require("express");
const { getAdminDashboard } = require("../controllers/Admin");
const asyncWrapper = require("../middleware/asyncWrapper");
const { auth, isAdmin} = require("../middleware/auth");
const router = express.Router();

router.post("/dashboard", asyncWrapper(getAdminDashboard));

module.exports = router;
