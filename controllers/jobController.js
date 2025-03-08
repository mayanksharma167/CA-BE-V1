const { ObjectId } = require("mongodb");
const Job = require("../models/jobModel");
const logger = require("../config/logger");
const requestIp = require('request-ip')
const IpTracker = require("../models/ipTracker");

const getAllJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const jobTitle = req.query.jobtitle || '';
    const companyName = req.query.companyname || '';

    const searchQuery = {};

    if (jobTitle) {
      searchQuery.jobTitle = { $regex: jobTitle, $options: 'i' };
    }

    if (companyName) {
      searchQuery.companyName = { $regex: companyName, $options: 'i' };
    }

    const jobFetchPromises = [
      Job.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Job.countDocuments(searchQuery),
    ];

    if (page === 1) {
      jobFetchPromises.push(bootstrapApi(req)); 
    }

    const [jobs, totalJobs] = await Promise.all(jobFetchPromises);

    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        totalJobs,
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
        hasNextPage: skip + limit < totalJobs,
      },
    });
  } catch (error) {
    logger.error("Error fetching jobs", { error });
    res.status(500).json({ success: false, message: "Failed to fetch jobs" });
  }
};

const bootstrapApi = async (req) => {
  try {
    const clientIp = requestIp.getClientIp(req);
    if (!clientIp) return;

    const ipRecord = await IpTracker.findOne({ ipAddress: clientIp });

    if (ipRecord) {
      ipRecord.requestCount += 1;
      ipRecord.lastRequest = Date.now();
      await ipRecord.save();
    } else {
      await IpTracker.create({ ipAddress: clientIp, requestCount: 1, lastRequest: Date.now() });
    }
  } catch (error) {
    logger.error("Error in bootstrap API", { error });
  }
};

module.exports = { getAllJobs,bootstrapApi }; 
