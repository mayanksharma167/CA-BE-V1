// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('=== EMAIL CONFIGURATION TEST ===');
console.log('SMTP Host:', process.env.SMTP_HOST);
console.log('SMTP Port:', process.env.SMTP_PORT);
console.log('SMTP Secure:', process.env.SMTP_SECURE);
console.log('SMTP Username:', process.env.SMTP_USERNAME);
console.log('SMTP Password:', process.env.SMTP_PASSWORD ? '[SET]' : '[NOT SET]');

async function testEmail() {
  // Create test account if no SMTP credentials provided
  let testAccount, testTransporter;
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
    console.log('\nNo SMTP credentials found in .env, creating test account...');
    testAccount = await nodemailer.createTestAccount();
    console.log('Created test account:', testAccount.user);
    
    testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log('Using Ethereal test account instead of real SMTP server');
  } else {
    console.log('\nUsing configured SMTP settings from .env');
    testTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      debug: true
    });
  }

  console.log('\nVerifying connection...');
  try {
    await testTransporter.verify();
    console.log('SMTP connection successful!');
  } catch (error) {
    console.error('SMTP connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  }

  console.log('\nSending test email...');
  try {
    const testEmail = process.env.TEST_EMAIL || process.env.SMTP_USERNAME;
    const info = await testTransporter.sendMail({
      from: `"Test Sender" <${process.env.SMTP_USERNAME || testAccount.user}>`,
      to: testEmail,
      subject: "Test Email - " + new Date().toISOString(),
      text: "This is a test email to verify SMTP configuration.",
      html: "<b>This is a test email to verify SMTP configuration.</b>",
    });

    console.log('Message sent: %s', info.messageId);
    
    if (testAccount) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    console.log('\n✅ EMAIL TEST SUCCESSFUL!');
  } catch (error) {
    console.error('\n❌ EMAIL SENDING FAILED:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  }
}

testEmail().catch(console.error);