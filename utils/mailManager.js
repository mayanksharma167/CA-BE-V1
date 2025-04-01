// utils/mailManager.js
const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("Initializing Mail Manager...");
console.log(`SMTP Host: ${process.env.SMTP_HOST || "Not defined"}`);
console.log(`SMTP Port: ${process.env.SMTP_PORT || "Not defined"}`);
console.log(`SMTP Secure: ${process.env.SMTP_SECURE || "Not defined"}`);
console.log(`SMTP Username: ${process.env.SMTP_USERNAME ? "Defined" : "Not defined"}`);
console.log(`SMTP Password: ${process.env.SMTP_PASSWORD ? "Defined (hidden)" : "Not defined"}`);

// Create transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: true, // Show debug output
  logger: true // Log information into console
});

// Test the connection
console.log("Testing SMTP connection...");
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP CONNECTION ERROR:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    if (error.code === 'EAUTH') {
      console.error("⚠️ AUTHENTICATION FAILED: Check your username and password");
    } else if (error.code === 'ESOCKET') {
      console.error("⚠️ SOCKET ERROR: Check your host and port settings");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("⚠️ CONNECTION TIMEOUT: Check your firewall or network settings");
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
  } else {
    console.log("✅ SMTP CONNECTION SUCCESSFUL: Mail server is ready to send messages");
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
  console.log(`- From Address: ${process.env.MAIL_FROM_ADDRESS || "Not defined"}`);
  
  try {
    console.log("Generating email template...");
    const htmlContent = getWelcomeEmailTemplate(firstName);
    console.log("Email template generated successfully");
    
    console.log("Sending email...");
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME || 'Your Platform'}" <${process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USERNAME}>`,
      to: email,
      subject: "Welcome to our platform!",
      html: htmlContent,
    };
    
    console.log("Mail options:", JSON.stringify({
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html.length
    }));
    
    const info = await transporter.sendMail(mailOptions);
    
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
    if (error.code === 'EENVELOPE') {
      console.error("⚠️ ENVELOPE ERROR: Check your from/to addresses");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("⚠️ TIMEOUT ERROR: Sending email timed out");
    } else if (error.responseCode >= 500) {
      console.error("⚠️ SERVER ERROR: The mail server rejected the request");
    } else if (error.responseCode >= 400) {
      console.error("⚠️ CLIENT ERROR: There's an issue with your request format");
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
  console.log(`Using logo URL: ${process.env.APP_LOGO_URL || 'Default placeholder'}`);
  console.log(`Using dashboard URL: ${process.env.APP_URL ? process.env.APP_URL + '/dashboard' : 'Not defined'}`);
  
  return `
  <!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shine {
            0% { transform: translateX(-100%) rotate(30deg); }
            50% { transform: translateX(100%) rotate(30deg); }
            100% { transform: translateX(-100%) rotate(30deg); }
        }
        
        .animate-fadeIn { animation: fadeIn 1.2s ease-out; }
        .animate-fadeInDown { animation: fadeInDown 1s ease-out; }
        .animate-fadeInUp { animation: fadeInUp 1s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 1s ease-out; }
        .animate-fadeIn-slow { animation: fadeIn 1.5s ease-out; }
        
        .shine-effect {
            position: relative;
            overflow: hidden;
        }
        .shine-effect::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: rgba(255, 255, 255, 0.1);
            transform: rotate(30deg);
            animation: shine 6s infinite;
        }
    </style>
</head>
<body style="background-color: #1e1e1e; margin: 0; padding: 0; font-family: 'Poppins', sans-serif; line-height: 1.6; color: #e2e8f0;">
    <!-- Table wrapper for entire email -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#1e1e1e" style="background-color: #1e1e1e; width: 100%; margin: 0; padding: 0;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <!-- Container table -->
                <table class="animate-fadeIn" width="650" border="0" cellspacing="0" cellpadding="0" style="max-width: 650px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); background-color: #1e1e1e;">
                    <!-- Header section -->
                    <tr>
                        <td align="center" bgcolor="#006A4E" class="shine-effect" style="background-color: #006A4E; padding: 40px 20px; text-align: center; position: relative;">
                            <img class="animate-fadeInDown" src="${process.env.APP_LOGO_URL || 'https://via.placeholder.com/180x60/006A4E/ffffff?text=LOGO'}" alt="Company Logo" style="max-width: 180px; display: block; margin: 0 auto; position: relative; z-index: 1;">
                        </td>
                    </tr>
                    
                    <!-- Content section -->
                    <tr>
                        <td bgcolor="#2d2d2d" style="background-color: #2d2d2d; padding: 40px; color: #d1d5db;">
                            <h1 class="animate-slideInLeft" style="color: #00A07A; margin-bottom: 20px; font-weight: 600;">Welcome to Our Platform, ${firstName}!</h1>
                            
                            <p style="margin-bottom: 20px; color: #d1d5db;">Thank you for joining our community. We're thrilled to have you on board!</p>
                            
                            <p style="margin-bottom: 20px; color: #d1d5db;">Our platform offers cutting-edge features to help you learn, grow, and connect:</p>
                            
                            <!-- Features list -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                                <tr class="animate-fadeInUp" style="animation-delay: 0.2s;">
                                    <td width="25" style="padding-bottom: 15px; vertical-align: top; color: #006A4E; font-weight: bold;">✓</td>
                                    <td style="padding-bottom: 15px; color: #d1d5db;">Complete your profile to personalize your experience</td>
                                </tr>
                                <tr class="animate-fadeInUp" style="animation-delay: 0.4s;">
                                    <td width="25" style="padding-bottom: 15px; vertical-align: top; color: #006A4E; font-weight: bold;">✓</td>
                                    <td style="padding-bottom: 15px; color: #d1d5db;">Explore our courses and learning materials</td>
                                </tr>
                                <tr class="animate-fadeInUp" style="animation-delay: 0.6s;">
                                    <td width="25" style="padding-bottom: 15px; vertical-align: top; color: #006A4E; font-weight: bold;">✓</td>
                                    <td style="padding-bottom: 15px; color: #d1d5db;">Connect with other members of our community</td>
                                </tr>
                                <tr class="animate-fadeInUp" style="animation-delay: 0.8s;">
                                    <td width="25" style="padding-bottom: 15px; vertical-align: top; color: #006A4E; font-weight: bold;">✓</td>
                                    <td style="padding-bottom: 15px; color: #d1d5db;">Track your progress and achievements</td>
                                </tr>
                            </table>
                            
                            <!-- Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="animate-fadeIn-slow" style="margin: 20px 0;">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td bgcolor="#006A4E" style="border-radius: 50px; padding: 14px 32px; background-color: #006A4E; box-shadow: 0 4px 15px rgba(0, 106, 78, 0.4); transition: all 0.3s ease;">
                                                    <a href="${process.env.APP_URL ? process.env.APP_URL + '/jobs' : '#'}" style="color: #ffffff; text-decoration: none; display: inline-block; font-weight: 600; font-family: 'Poppins', sans-serif;">Go to My Dashboard</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin-bottom: 20px; color: #d1d5db;">Questions? Reach out to our support team at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}" style="color: #00A07A; text-decoration: none;">${process.env.SUPPORT_EMAIL || 'support@example.com'}</a>.</p>
                            
                            <p style="margin-bottom: 20px; color: #d1d5db;">Best regards,<br>The Team</p>
                        </td>
                    </tr>
                    
                    <!-- Footer section -->
                    <tr>
                        <td bgcolor="#1e1e1e" style="background-color: #1e1e1e; padding: 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                            <p style="margin-bottom: 20px; color: #9ca3af;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
                            
                            <!-- Social links -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.FACEBOOK_URL || '#'}" style="color: #00A07A; text-decoration: none; margin: 0 15px; transition: color 0.3s ease;">Instagram</a>
                                        <a href="${process.env.TWITTER_URL || '#'}" style="color: #00A07A; text-decoration: none; margin: 0 15px; transition: color 0.3s ease;">Twitter</a>
                                        <a href="${process.env.LINKEDIN_URL || '#'}" style="color: #00A07A; text-decoration: none; margin: 0 15px; transition: color 0.3s ease;">LinkedIn</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin-bottom: 10px; color: #9ca3af;">
                                You received this email because you signed up on our platform.<br>
                                If this wasn't you, please <a href="${process.env.APP_URL ? process.env.APP_URL + '/contact' : '#'}" style="color: #00A07A; text-decoration: none; transition: color 0.3s ease;">contact us</a>.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};

module.exports = {
  sendWelcomeEmail,
};