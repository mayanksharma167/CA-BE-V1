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

// Create transporter object with improved settings for cloud environments
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10), // Ensure port is a number
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: process.env.NODE_ENV !== "production", // Only debug in non-production
  logger: process.env.NODE_ENV !== "production", // Only log in non-production
  // Use more conservative connection settings for cloud environments
  pool: true, // Use connection pool
  maxConnections: 2, // Reduced from 3 to be more conservative
  maxMessages: 50, // Reduced from 100 to avoid rate limits
  rateDelta: 2000, // Increased from 1000 to be more conservative
  rateLimit: 3, // Reduced from 5 to avoid rate limits
  connectionTimeout: 15000, // Increased from 10000 to give more time for connection
  socketTimeout: 45000, // Increased from 30000 to give more time for operations
  // TLS settings to improve security and compatibility
  tls: {
    rejectUnauthorized: true, // Changed to true for production security
    minVersion: "TLSv1.2", // Ensure secure TLS version
  },
});

// Check environment and adjust TLS settings accordingly
if (process.env.NODE_ENV === "development") {
  // Less strict in development for self-signed certs
  transporter.options.tls.rejectUnauthorized = false;
}

// Test the connection but don't block startup
console.log("Testing SMTP connection...");
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP CONNECTION ERROR:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    // Don't log entire stack trace in production
    if (process.env.NODE_ENV !== "production") {
      console.error("Error stack:", error.stack);
    }

    if (error.code === "EAUTH") {
      console.error(
        "⚠️ AUTHENTICATION FAILED: Check your username and password"
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
  } else {
    console.log(
      "✅ SMTP CONNECTION SUCCESSFUL: Mail server is ready to send messages"
    );
  }
});

/**
 * Send welcome email to new users after registration
 * @param {string} name - User's full name
 * @param {string} email - User's email address
 * @returns {Promise} - Resolves with info about sent email
 */
const sendWelcomeEmail = async (name, email) => {
  console.log(`Preparing to send welcome email to ${email}...`);
  const firstName = name.split(" ")[0];

  // Debug info - only log in non-production
  if (process.env.NODE_ENV !== "production") {
    console.log("Email parameters:");
    console.log(`- Recipient: ${email}`);
    console.log(`- Name: ${name}`);
    console.log(`- First Name: ${firstName}`);
    console.log(`- From Name: ${process.env.MAIL_FROM_NAME || "Not defined"}`);
    console.log(
      `- From Address: ${process.env.MAIL_FROM_ADDRESS || "Not defined"}`
    );
  }

  try {
    console.log("Generating email template...");
    const htmlContent = getWelcomeEmailTemplate(firstName);
    console.log("Email template generated successfully");

    console.log("Sending email...");
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME || "Your Platform"}" <${
        process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USERNAME
      }>`,
      to: email,
      subject: "Welcome to our platform!",
      html: htmlContent,
      // Add text version as fallback
      text: `Welcome to our platform, ${firstName}! Thank you for joining our community. We're thrilled to have you on board!`,
      // Add these for better reliability
      encoding: "utf-8",
      disableFileAccess: true,
      disableUrlAccess: true,
      headers: {
        "X-Priority": "1", // High priority
        Importance: "high",
      },
    };

    // Only log details in non-production
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "Mail options:",
        JSON.stringify({
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          htmlLength: mailOptions.html.length,
        })
      );
    } else {
      console.log(`Sending email to: ${email}`);
    }

    // Set a timeout for the send operation
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise(
      (_, reject) =>
        setTimeout(() => reject(new Error("Email send timeout")), 45000) // Increased from 30000
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log("✅ EMAIL SENT SUCCESSFULLY:");
    console.log("- Message ID:", info.messageId);

    // Only log detailed info in non-production
    if (process.env.NODE_ENV !== "production") {
      console.log("- Response:", info.response);
      console.log("- Accepted recipients:", info.accepted);
      console.log("- Rejected recipients:", info.rejected);
    }

    return info;
  } catch (error) {
    console.error("❌ ERROR SENDING EMAIL:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    // Only log stack trace in non-production
    if (process.env.NODE_ENV !== "production") {
      console.error("Error stack:", error.stack);
    }

    // Common error diagnostics
    if (error.code === "EENVELOPE") {
      console.error("⚠️ ENVELOPE ERROR: Check your from/to addresses");
    } else if (error.code === "ETIMEDOUT") {
      console.error("⚠️ TIMEOUT ERROR: Sending email timed out");
    } else if (error.code === "EMESSAGE") {
      console.error("⚠️ MESSAGE ERROR: Invalid message format");
    } else if (error.responseCode >= 500) {
      console.error("⚠️ SERVER ERROR: The mail server rejected the request");
    } else if (error.responseCode >= 400) {
      console.error(
        "⚠️ CLIENT ERROR: There's an issue with your request format"
      );
    }

    // Return error info instead of throwing
    return {
      success: false,
      error: error.message,
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
  // Only log in non-production
  if (process.env.NODE_ENV !== "production") {
    console.log("Building email template with user first name:", firstName);
    console.log(
      `Using logo URL: ${process.env.APP_LOGO_URL || "Default placeholder"}`
    );
    console.log(
      `Using dashboard URL: ${
        process.env.APP_URL ? process.env.APP_URL + "/dashboard" : "Not defined"
      }`
    );
  }

  // Use a simpler email template for better compatibility
  return `
  <!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
    <style>
        body {
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .header {
            background-color: #006A4E;
            padding: 30px 20px;
            text-align: center;
        }
        
        .logo {
            max-width: 160px;
        }
        
        .content {
            padding: 30px;
            color: #333333;
        }
        
        h1 {
            color: #006A4E;
            margin-bottom: 20px;
        }
        
        .feature {
            margin-bottom: 12px;
        }
        
        .button {
            display: inline-block;
            background-color: #006A4E;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
        }
        
        .footer {
            background-color: #f1f1f1;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img class="logo" src="${
              process.env.APP_LOGO_URL ||
              "https://via.placeholder.com/160x60/006A4E/ffffff?text=LOGO"
            }" alt="Company Logo">
        </div>
        
        <div class="content">
            <h1>Welcome to Our Platform, ${firstName}!</h1>
            
            <p>Thank you for joining our community. We're thrilled to have you on board!</p>
            
            <p>Our platform offers cutting-edge features to help you learn, grow, and connect:</p>
            
            <div class="feature">
                ✓ Complete your profile to personalize your experience
            </div>
            <div class="feature">
                ✓ Explore our courses and learning materials
            </div>
            <div class="feature">
                ✓ Connect with other members of our community
            </div>
            <div class="feature">
                ✓ Track your progress and achievements
            </div>
            
            <div style="text-align: center;">
                <a href="${
                  process.env.APP_URL ? process.env.APP_URL + "/dashboard" : "#"
                }" style="background-color: #006A4E; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold; display: inline-block; margin: 20px 0;">Go to My Dashboard</a>
            </div>
            
            <p>Questions? Reach out to our support team at <a href="mailto:${
              process.env.SUPPORT_EMAIL || "support@example.com"
            }" style="color: #006A4E;">${
    process.env.SUPPORT_EMAIL || "support@example.com"
  }</a>.</p>
            
            <p>Best regards,<br>The Team</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME || "Your Company"
  }. All rights reserved.</p>
            
            <p>
                You received this email because you signed up on our platform.<br>
                If this wasn't you, please <a href="${
                  process.env.APP_URL ? process.env.APP_URL + "/contact" : "#"
                }" style="color: #006A4E;">contact us</a>.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

module.exports = {
  sendWelcomeEmail,
};
