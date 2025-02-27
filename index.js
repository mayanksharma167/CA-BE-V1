const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("./config/logger");
const database = require("./config/database");
const jobRoutes = require("./routes/jobRoutes");
const errorHandler = require("./middleware/errorHandler");
const userRoutes = require("./routes/User");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
database.connect();

// Middleware
app.use(express.json());

// Configure CORS to allow only your frontend origin
const corsOptions = {
  origin: "https://www.codingarrow.com", // Replace with your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow these HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
  credentials: true, // Allow cookies, authentication headers, etc., if needed
};

app.use(cors(corsOptions));

// Routes
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/auth", userRoutes);

// Health Check
app.get("/", (req, res) => {
  return res.status(200).json({ success: true, message: "API is running" });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
