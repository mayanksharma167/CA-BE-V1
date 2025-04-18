const express = require("express");
const { getAllJobs } = require("../controllers/jobController");
const asyncWrapper = require("../middleware/asyncWrapper");
const { auth, isAdmin} = require("../middleware/auth");

const router = express.Router();

router.get("/all-jobs", asyncWrapper(getAllJobs));

module.exports = router;
