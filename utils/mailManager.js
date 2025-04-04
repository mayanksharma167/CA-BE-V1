const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("Initializing Mail Manager...");
console.log(`SMTP Host: ${process.env.SMTP_HOST || "Not defined"}`);
console.log(`SMTP Port: ${process.env.SMTP_PORT || "Not defined"}`);
console.log(`SMTP Secure: ${process.env.SMTP_SECURE || "Not defined"}`);
console.log(
  `SMTP Username: ${process.env.SMTP_USERNAME ? "Defined" : "Not defined"}`
);
console.log(
  `SMTP Password: ${
    process.env.SMTP_PASSWORD ? "Defined (hidden)" : "Not defined"
  }`
);

// Enhanced logging for debugging in production temporarily
const isDebugMode =
  process.env.DEBUG_EMAIL === "true" || process.env.NODE_ENV !== "production";

// Async function to initialize and verify transporter
const initializeTransporter = async () => {
  // Create transporter object with improved settings for cloud environments
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10), // Ensure port is a number
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
    debug: isDebugMode, // Enable debug for troubleshooting
    logger: isDebugMode, // Enable logger for troubleshooting
    pool: false, // Disable pool for Gmail
    maxConnections: 1, // Single connection for reliability
    connectionTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    authMethod: "LOGIN",
  });

  console.log("Testing SMTP connection...");

  try {
    await transporter.verify();
    console.log(
      "✅ SMTP CONNECTION SUCCESSFUL: Mail server is ready to send messages"
    );
    return transporter;
  } catch (error) {
    console.error("❌ SMTP CONNECTION ERROR:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);

    if (error.code === "EAUTH") {
      console.error(
        "⚠️ AUTHENTICATION FAILED: Check your username and password"
      );
      console.error(
        "⚠️ For Gmail: Ensure 'Less secure app access' is enabled or use App Password"
      );
    } else if (error.code === "ESOCKET") {
      console.error("⚠️ SOCKET ERROR: Check your host and port settings");
    } else if (error.code === "ETIMEDOUT") {
      console.error(
        "⚠️ CONNECTION TIMEOUT: Check your firewall or network settings"
      );
    } else if (error.code === "ECONNECTION") {
      console.error("⚠️ CONNECTION ERROR: Unable to connect to mail server");
    } else if (error.code === "EDNS") {
      console.error("⚠️ DNS ERROR: Cannot resolve hostname");
    }

    // Check environment variables
    if (!process.env.SMTP_HOST) {
      console.error("⚠️ SMTP_HOST is not defined in environment variables");
    }
    if (!process.env.SMTP_PORT) {
      console.error("⚠️ SMTP_PORT is not defined in environment variables");
    }
    if (!process.env.SMTP_USERNAME) {
      console.error("⚠️ SMTP_USERNAME is not defined in environment variables");
    }
    if (!process.env.SMTP_PASSWORD) {
      console.error("⚠️ SMTP_PASSWORD is not defined in environment variables");
    }

    console.log(
      "⚠️ Email system will attempt to send emails despite verification failure"
    );
    // Return transporter even on failure, as per your original logic
    return transporter;
  }
};

// Initialize transporter and store the promise
const transporterPromise = initializeTransporter();

/**
 * Send welcome email to new users after registration
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @returns {Promise} - Resolves with info about sent email
 */
const sendWelcomeEmail = async (name, email) => {
  console.log(`[EMAIL_ATTEMPT] Preparing to send welcome email to ${email}...`);

  if (!name || !email) {
    console.error("[EMAIL_ERROR] Missing required parameters:", {
      name,
      email,
    });
    return {
      success: false,
      error: "Missing required parameters",
      messageId: null,
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("[EMAIL_ERROR] Invalid email format:", email);
    return {
      success: false,
      error: "Invalid email format",
      messageId: null,
    };
  }

  const firstName = name.split(" ")[0];

  console.log("[EMAIL_PARAMS]", {
    recipient: email,
    name,
    firstName,
    fromName: process.env.MAIL_FROM_NAME || "Not defined",
    fromAddress:
      process.env.MAIL_FROM_ADDRESS ||
      process.env.SMTP_USERNAME ||
      "Not defined",
  });

  try {
    // Wait for the transporter to be initialized
    const transporter = await transporterPromise;

    console.log("[EMAIL_PROGRESS] Generating email template...");
    const htmlContent = getWelcomeEmailTemplate(firstName);
    console.log("[EMAIL_PROGRESS] Email template generated successfully");

    const fromAddress =
      process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USERNAME;
    const fromName = process.env.MAIL_FROM_NAME || "Your Platform";
    const from = fromAddress.includes("@gmail.com")
      ? fromAddress
      : `"${fromName}" <${fromAddress}>`;

    console.log(`[EMAIL_PROGRESS] Using from address: ${from}`);
    console.log("[EMAIL_PROGRESS] Sending email...");

    const mailOptions = {
      from: from,
      to: email,
      subject: "Welcome to our platform!",
      html: htmlContent,
      text: `Welcome to our platform, ${firstName}! Thank you for joining our community. We're thrilled to have you on board!`,
      encoding: "utf-8",
      disableFileAccess: true,
      disableUrlAccess: true,
    };

    console.log(
      "[EMAIL_CONFIG]",
      JSON.stringify({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
      })
    );

    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("[EMAIL_TIMEOUT] Email send timeout after 60s")),
        60000
      )
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log("[EMAIL_SUCCESS] Email sent successfully:", {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("[EMAIL_ERROR] Failed to send email:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);

    if (error.code === "EENVELOPE") {
      console.error(
        "[EMAIL_ERROR_DETAIL] ENVELOPE ERROR: Check your from/to addresses"
      );
    } else if (error.code === "ETIMEDOUT") {
      console.error(
        "[EMAIL_ERROR_DETAIL] TIMEOUT ERROR: Sending email timed out"
      );
    } else if (error.code === "EMESSAGE") {
      console.error(
        "[EMAIL_ERROR_DETAIL] MESSAGE ERROR: Invalid message format"
      );
    } else if (error.responseCode >= 500) {
      console.error(
        "[EMAIL_ERROR_DETAIL] SERVER ERROR: The mail server rejected the request"
      );
    } else if (error.responseCode >= 400) {
      console.error(
        "[EMAIL_ERROR_DETAIL] CLIENT ERROR: There's an issue with your request format"
      );
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
      messageId: null,
    };
  }
};

/**
 * Generate HTML template for welcome email
 * @param {string} firstName - User's first name
 * @returns {string} - HTML template
 */
const getWelcomeEmailTemplate = (firstName) => {
  console.log("[EMAIL_TEMPLATE] Creating template for:", firstName);

  return `
  <!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
</head>
<body style="background-color: #f9f9f9; margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 5px; overflow: hidden;">
        <div style="background-color: #006A4E; padding: 20px; text-align: center;">
            <img src="${
              process.env.APP_LOGO_URL ||
              "https://via.placeholder.com/150x50/006A4E/ffffff?text=LOGO"
            }" alt="Company Logo" style="max-width: 150px;">
        </div>
        
        <div style="padding: 20px; color: #333333;">
            <h1 style="color: #006A4E; margin-bottom: 20px;">Welcome to Our Platform, ${firstName}!</h1>
            
            <p>Thank you for joining our community. We're thrilled to have you on board!</p>
            
            <p>Our platform offers cutting-edge features to help you learn, grow, and connect:</p>
            
            <div style="margin-bottom: 10px;">✓ Complete your profile to personalize your experience</div>
            <div style="margin-bottom: 10px;">✓ Explore our courses and learning materials</div>
            <div style="margin-bottom: 10px;">✓ Connect with other members of our community</div>
            <div style="margin-bottom: 10px;">✓ Track your progress and achievements</div>
            
            <div style="text-align: center; margin: 25px 0;">
                <a href="${
                  process.env.APP_URL ? process.env.APP_URL + "/dashboard" : "#"
                }" style="background-color: #006A4E; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 3px; font-weight: bold;">Go to My Dashboard</a>
            </div>
            
            <p>Questions? Reach out to our support team at <a href="mailto:${
              process.env.SUPPORT_EMAIL || "support@example.com"
            }" style="color: #006A4E;">${
    process.env.SUPPORT_EMAIL || "support@example.com"
  }</a>.</p>
            
            <p>Best regards,<br>The Team</p>
        </div>
        
        <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666666;">
            <p>© ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME || "Your Company"
  }. All rights reserved.</p>
            
            <p>
                You received this email because you signed up on our platform.<br>
                If this wasn't you, please contact us.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

module.exports = {
  sendWelcomeEmail,
  transporterPromise, // Export for testing or manual use if needed
};
