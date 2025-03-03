const { ObjectId } = require("mongodb");
const Job = require("../models/jobModel");
const logger = require("../config/logger");

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
  
      const jobs = await Job.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
  
      const totalJobs = await Job.countDocuments(searchQuery);
  
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
module.exports = { getAllJobs };
