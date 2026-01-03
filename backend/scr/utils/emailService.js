import nodemailer from "nodemailer";

// Create reusable transporter (Gmail SMTP)
const createTransporter = () => {
  // Validate environment variables
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!gmailUser || !gmailPass) {
    throw new Error(
      "Email credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file"
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true only for 465
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// ==============================
// Send Verification Email
// ==============================
export const sendVerificationEmail = async (email, verificationToken, name) => {
  try {
    // Validate inputs
    if (!email || !verificationToken) {
      throw new Error("Email and verification token are required");
    }

    const transporter = createTransporter();

    const verificationUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/verify-email?token=${verificationToken}`;

    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"Dayflow HRMS" <${gmailUser}>`,
      to: email,
      subject: "Verify Your Email Address - Dayflow HRMS",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Dayflow HRMS</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Email Verification Required</h2>
            <p>Hello ${name || "User"},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        display: inline-block;
                        font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #667eea; word-break: break-all; font-size: 12px;">${verificationUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${name || "User"},

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours. If you didn't create an account, please ignore this email.
      `,
    });

    console.log("✅ Verification email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending verification email:", error.message);
    // Don't throw, just return error so the app doesn't crash
    return { success: false, error: error.message };
  }
};

// ==============================
// Send Welcome Email
// ==============================
export const sendWelcomeEmail = async (
  email,
  loginId,
  temporaryPassword,
  name
) => {
  try {
    // Validate inputs
    if (!email || !loginId || !temporaryPassword) {
      throw new Error("Email, loginId, and temporaryPassword are required");
    }

    const transporter = createTransporter();

    const loginUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/signin`;

    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: `"Dayflow HRMS" <${gmailUser}>`,
      to: email,
      subject: "Welcome to Dayflow HRMS - Your Account Details",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Dayflow HRMS</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Your Account Has Been Created</h2>
            <p>Hello ${name || "User"},</p>
            <p>Your account has been successfully created. Here are your login credentials:</p>
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 10px 0;"><strong>Login ID:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${loginId}</code></p>
              <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${temporaryPassword}</code></p>
            </div>
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        display: inline-block;
                        font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, please contact your HR department.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome ${name || "User"},

Your account has been successfully created. Here are your login credentials:

Login ID: ${loginId}
Temporary Password: ${temporaryPassword}

Important: Please change your password after your first login for security purposes.

Login here: ${loginUrl}

If you have any questions, please contact your HR department.
      `,
    });

    console.log("✅ Welcome email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending welcome email:", error.message);
    return { success: false, error: error.message };
  }
};
