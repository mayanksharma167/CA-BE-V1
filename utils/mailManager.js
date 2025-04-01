// utils/mailManager.js
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
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: true,
  logger: true,
  // Add these options to improve reliability in cloud environments
  pool: true, // Use connection pool
  maxConnections: 3, // Limit connections
  maxMessages: 100, // Messages per connection
  rateDelta: 1000, // Time between messages
  rateLimit: 5, // Max messages per rateDelta
  connectionTimeout: 10000, // 10 seconds
  socketTimeout: 30000, // 30 seconds
  // TLS settings to improve security and compatibility
  tls: {
    rejectUnauthorized: false, // Don't reject self-signed or invalid certs
  },
});

// Test the connection
console.log("Testing SMTP connection...");
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP CONNECTION ERROR:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

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
    }

    if (!process.env.SMTP_HOST) {
      console.error("⚠️ SMTP_HOST is not defined in .env file");
    }
    if (!process.env.SMTP_PORT) {
      console.error("⚠️ SMTP_PORT is not defined in .env file");
    }
    if (!process.env.SMTP_USERNAME) {
      console.error("⚠️ SMTP_USERNAME is not defined in .env file");
    }
    if (!process.env.SMTP_PASSWORD) {
      console.error("⚠️ SMTP_PASSWORD is not defined in .env file");
    }

    // Continue even if verification fails - don't block app startup
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

  // Debug info
  console.log("Email parameters:");
  console.log(`- Recipient: ${email}`);
  console.log(`- Name: ${name}`);
  console.log(`- First Name: ${firstName}`);
  console.log(`- From Name: ${process.env.MAIL_FROM_NAME || "Not defined"}`);
  console.log(
    `- From Address: ${process.env.MAIL_FROM_ADDRESS || "Not defined"}`
  );

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

    console.log(
      "Mail options:",
      JSON.stringify({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        htmlLength: mailOptions.html.length,
      })
    );

    // Set a timeout for the send operation
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email send timeout")), 30000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log("✅ EMAIL SENT SUCCESSFULLY:");
    console.log("- Message ID:", info.messageId);
    console.log("- Response:", info.response);
    console.log("- Accepted recipients:", info.accepted);
    console.log("- Rejected recipients:", info.rejected);

    return info;
  } catch (error) {
    console.error("❌ ERROR SENDING EMAIL:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Common error diagnostics
    if (error.code === "EENVELOPE") {
      console.error("⚠️ ENVELOPE ERROR: Check your from/to addresses");
    } else if (error.code === "ETIMEDOUT") {
      console.error("⚠️ TIMEOUT ERROR: Sending email timed out");
    } else if (error.responseCode >= 500) {
      console.error("⚠️ SERVER ERROR: The mail server rejected the request");
    } else if (error.responseCode >= 400) {
      console.error(
        "⚠️ CLIENT ERROR: There's an issue with your request format"
      );
    }

    // Swallow the error in production to prevent breaking signup flow
    if (process.env.NODE_ENV === "production") {
      console.error(
        "⚠️ Email error occurred but continuing to avoid disrupting user signup flow"
      );
      return {
        success: false,
        error: error.message,
        messageId: null,
      };
    }

    throw error;
  }
};

/**
 * Generate HTML template for welcome email
 * @param {string} firstName - User's first name
 * @returns {string} - HTML template
 */
const getWelcomeEmailTemplate = (firstName) => {
  console.log("Building email template with user first name:", firstName);
  console.log(
    `Using logo URL: ${process.env.APP_LOGO_URL || "Default placeholder"}`
  );
  console.log(
    `Using dashboard URL: ${
      process.env.APP_URL ? process.env.APP_URL + "/dashboard" : "Not defined"
    }`
  );

  return `
  <!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
    <style>
        @media screen {
            @font-face {
                font-family: 'Poppins';
                font-style: normal;
                font-weight: 400;
                src: url(https://fonts.gstatic.com/s/poppins/v15/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
            }
        }
        
        body {
            background-color: #1e1e1e;
            margin: 0;
            padding: 0;
            font-family: 'Poppins', Arial, sans-serif;
            line-height: 1.6;
            color: #e2e8f0;
        }
        
        .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #2d2d2d;
            border-radius: 16px;
            overflow: hidden;
        }
        
        .header {
            background-color: #006A4E;
            padding: 40px 20px;
            text-align: center;
        }
        
        .logo {
            max-width: 180px;
        }
        
        .content {
            padding: 40px;
            color: #d1d5db;
        }
        
        h1 {
            color: #00A07A;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .feature {
            margin-bottom: 15px;
        }
        
        .feature-check {
            color: #006A4E;
            font-weight: bold;
        }
        
        .button {
            display: inline-block;
            background-color: #006A4E;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 50px;
            font-weight: 600;
            margin: 20px 0;
        }
        
        .footer {
            background-color: #1e1e1e;
            padding: 30px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .social-link {
            color: #00A07A;
            text-decoration: none;
            margin: 0 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img class="logo" src="${
              process.env.APP_LOGO_URL ||
              "https://via.placeholder.com/180x60/006A4E/ffffff?text=LOGO"
            }" alt="Company Logo">
        </div>
        
        <div class="content">
            <h1>Welcome to Our Platform, ${firstName}!</h1>
            
            <p>Thank you for joining our community. We're thrilled to have you on board!</p>
            
            <p>Our platform offers cutting-edge features to help you learn, grow, and connect:</p>
            
            <div class="feature">
                <span class="feature-check">✓</span> Complete your profile to personalize your experience
            </div>
            <div class="feature">
                <span class="feature-check">✓</span> Explore our courses and learning materials
            </div>
            <div class="feature">
                <span class="feature-check">✓</span> Connect with other members of our community
            </div>
            <div class="feature">
                <span class="feature-check">✓</span> Track your progress and achievements
            </div>
            
            <center>
                <a href="${
                  process.env.APP_URL ? process.env.APP_URL + "/jobs" : "#"
                }" class="button">Go to My Dashboard</a>
            </center>
            
            <p>Questions? Reach out to our support team at <a href="mailto:${
              process.env.SUPPORT_EMAIL || "support@example.com"
            }" style="color: #00A07A; text-decoration: none;">${
    process.env.SUPPORT_EMAIL || "support@example.com"
  }</a>.</p>
            
            <p>Best regards,<br>The Team</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${
    process.env.COMPANY_NAME || "Your Company"
  }. All rights reserved.</p>
            
            <div>
                <a href="${
                  process.env.FACEBOOK_URL || "#"
                }" class="social-link">Instagram</a>
                <a href="${
                  process.env.TWITTER_URL || "#"
                }" class="social-link">Twitter</a>
                <a href="${
                  process.env.LINKEDIN_URL || "#"
                }" class="social-link">LinkedIn</a>
            </div>
            
            <p>
                You received this email because you signed up on our platform.<br>
                If this wasn't you, please <a href="${
                  process.env.APP_URL ? process.env.APP_URL + "/contact" : "#"
                }" style="color: #00A07A; text-decoration: none;">contact us</a>.
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
