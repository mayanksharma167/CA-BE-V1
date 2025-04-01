const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Profile = require("../models/Profile");
require("dotenv").config();
const { oauth2Client } = require("../utils/googleClient");
const axios = require("axios");
const { sendWelcomeEmail } = require("../utils/mailManager");

exports.signup = async (req, res) => {
  console.log("Starting signup process...");
  try {
    const { name, email, password, confirmPassword, accountType } = req.body;
    console.log(`Received signup request for email: ${email}`);
    
    if (!name || !email || !password || !confirmPassword) {
      console.log("Missing required fields:", {
        name: !!name,
        email: !!email,
        password: !!password,
        confirmPassword: !!confirmPassword
      });
      return res.status(403).send({
        success: false,
        message: "Please Fill up All the Required Fields",
      });
    }
    
    if (password !== confirmPassword) {
      console.log("Password mismatch");
      return res.status(400).json({
        success: false,
        message:
          "Password and Confirm Password do not match. Please try again.",
      });
    }

    console.log("Checking if user already exists...");
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return res.status(400).json({
        success: false,
        message: "User already exists. Please sign in to continue.",
      });
    }

    // Hash the password
    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully");

    // Create the Additional Profile For User
    console.log("Creating user profile...");
    const profileDetails = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    });
    console.log("Profile created with ID:", profileDetails._id);
    
    const [firstName, lastName] = name.includes(" ")
      ? name.split(" ")
      : [name, ""];
    console.log(`Name parsed as: ${firstName} ${lastName}`);

    console.log("Creating user record...");
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      accountType: accountType || "Student",
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/5.x/initials/svg?seed=${name}`,
    });
    console.log("User created successfully with ID:", user._id);
    user.password = undefined;

    // Send welcome email
    console.log("Attempting to send welcome email...");
    try {
      console.log(`Calling sendWelcomeEmail for ${name} <${email}>`);
      const emailResult = await sendWelcomeEmail(name, email);
      console.log("Welcome email sent successfully:", emailResult.messageId);
    } catch (emailError) {
      console.error("Failed to send welcome email:");
      console.error("Error name:", emailError.name);
      console.error("Error message:", emailError.message);
      console.error("Error stack:", emailError.stack);
      // Continue with registration even if email fails
      console.log("Proceeding with registration despite email failure");
    }

    console.log("Registration completed successfully");
    return res.status(200).json({
      success: true,
      user,
      message: "User Registered Successfully",
    });
  } catch (error) {
    console.error("Error during signup process:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: "User Cannot be Registered. Please Try Again.",
    });
  }
};

exports.login = async (req, res) => {
  console.log("Starting login process...");
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    if (!email || !password) {
      console.log("Missing required fields:", {
        email: !!email,
        password: !!password
      });
      return res.status(400).json({
        success: false,
        message: `Please Fill up All the Required Fields`,
      });
    }

    console.log("Finding user in database...");
    const user = await User.findOne({ email }).populate("additionalDetails");

    if (!user) {
      console.log(`User with email ${email} not found`);
      // Return 401 Unauthorized status code with error message
      return res.status(401).json({
        success: false,
        message: `User is Not Registered`,
      });
    }
    console.log("User found with ID:", user._id);

    // Generate JWT token and Compare Password
    console.log("Verifying password...");
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", passwordMatch);
    
    if (passwordMatch) {
      console.log("Password verified, generating JWT token...");
      const token = jwt.sign(
        { email: user.email, id: user._id, accountType: user.accountType },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );
      console.log("JWT token generated successfully");

      user.token = token;
      user.password = undefined;
      // Set cookie for token and return success response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };
      console.log("Login successful, sending response");
      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: `User Loggedin Successfully`,
      });
    } else {
      console.log("Password verification failed");
      return res.status(401).json({
        success: false,
        message: `Password is Incorrect`,
      });
    }
  } catch (error) {
    console.error("Error during login process:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return res.status(500).json({
      success: false,
      message: `Login Failure Please Try Again`,
    });
  }
};

exports.googleAuth = async (req, res, next) => {
  console.log("Starting Google authentication process...");
  const code = req.body.token;
  console.log("Received Google auth token");
  
  try {
    console.log("Exchanging code for Google tokens...");
    const googleRes = await oauth2Client.getToken(code);
    console.log("Token exchange successful");
    
    oauth2Client.setCredentials(googleRes.tokens);
    console.log("Getting user info from Google...");
    
    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );
    console.log("User info retrieved from Google");
    
    const { email, name, picture } = userRes.data;
    console.log(`Google user info: email=${email}, name=${name}`);
    
    console.log("Checking if user exists in our database...");
    let user = await User.findOne({ email });

    if (!user) {
      console.log("User not found, creating new user account...");
      const profileDetails = await Profile.create({
        gender: null,
        dateOfBirth: null,
        about: null,
        contactNumber: null,
      });
      console.log("Profile created with ID:", profileDetails._id);
      
      user = await User.create({
        name,
        email,
        accountType: "Student",
        additionalDetails: profileDetails._id,
        image: picture,
      });
      console.log("User created successfully with ID:", user._id);
      
      // Send welcome email for new users registering with Google
      console.log("Attempting to send welcome email for Google signup...");
      try {
        console.log(`Calling sendWelcomeEmail for ${name} <${email}>`);
        const emailResult = await sendWelcomeEmail(name, email);
        console.log("Welcome email sent successfully:", emailResult.messageId);
      } catch (emailError) {
        console.error("Failed to send welcome email for Google signup:");
        console.error("Error name:", emailError.name);
        console.error("Error message:", emailError.message);
        console.error("Error stack:", emailError.stack);
        // Continue with login even if email fails
        console.log("Proceeding with Google login despite email failure");
      }
    } else {
      console.log("Existing user found with ID:", user._id);
    }
    
    console.log("Generating JWT token...");
    const token = jwt.sign(
      { email: user.email, id: user._id, accountType: user.accountType },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );
    console.log("JWT token generated successfully");
    
    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };
    
    console.log("Google authentication successful, sending response");
    res.cookie("token", token, options).status(200).json({
      success: true,
      token,
      user,
      message: `User Loggedin Successfully`,
    });
  } catch (err) {
    console.error("Error during Google authentication process:");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    if (err.response) {
      console.error("Google API response error:", {
        status: err.response.status,
        data: err.response.data
      });
    }
    
    return res.status(500).json({
      success: false,
      message: `Login Failure Please Try Again`,
    });
  }
};