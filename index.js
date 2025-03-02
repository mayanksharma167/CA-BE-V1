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

database.connect();

app.use(express.json());

const allowedOrigins = [
  "http://localhost:8000", // Your frontend development URL
  "https://www.codingarrow.com", // Your production frontend URL
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/auth", userRoutes);

app.get("/", (req, res) => {
  return res.status(200).json({ success: true, message: "API is running" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
