const { ObjectId } = require("mongodb");
const Job = require("../models/jobModel");
const logger = require("../config/logger");
const requestIp = require('request-ip')
const IpTracker = require("../models/ipTracker");

const getAdminDashboard = async (req, res) => {
    try {
      const { date } = req.body; 
      if (!date) {
        return res.status(400).json({ success: false, message: "Date is required" });
      }
  
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0); 
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);
  
      const totalUsers = await IpTracker.countDocuments({
        lastRequest: { $gte: selectedDate, $lt: nextDay },
      });
  
      const totalHitsResult = await IpTracker.aggregate([
        { $match: { lastRequest: { $gte: selectedDate, $lt: nextDay } } },
        { $group: { _id: null, total: { $sum: "$requestCount" } } },
      ]);
  
      const totalHits = totalHitsResult.length > 0 ? totalHitsResult[0].total : 0;
  
      return res.status(200).json({ success: true, totalUsers, totalHits });
    } catch (error) {
      console.error("Error fetching admin dashboard data", error);
      res.status(500).json({ success: false, message: "Error fetching admin dashboard data" });
    }
  };
  
  
  module.exports = { getAdminDashboard }; 
  