import nodemailer from "nodemailer";
import crypto from "crypto";

// Email configuration - use environment variables or test account
let transporter;

// Check if real email sending is enabled (requires explicit ENABLE_REAL_EMAIL=true)
if (
  process.env.ENABLE_REAL_EMAIL === "true" &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
) {
  // Use real SMTP configuration
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("📧 Real email mode enabled");
} else {
  // Development mode: no real emails sent
  console.log("⚠️  Development mode: emails will not be sent, invite links will be shown in console");
  transporter = null;
}

// Generate invite token
export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Send team invitation email
export async function sendTeamInviteEmail({
  email,
  teamName,
  inviterName,
  role,
  inviteToken,
  teamId,
}) {
  const inviteLink = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/invite/${inviteToken}`;

  const roleText = role === "admin" ? "Administrator" : "Member";

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Invitation to join team: ${teamName}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">MarkWeave Team Invitation</h1>

          <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">You are invited to join the team</h2>

            <div style="text-align: left; margin: 20px 0;">
              <p><strong>Team Name:</strong> ${teamName}</p>
              <p><strong>Inviter:</strong> ${inviterName}</p>
              <p><strong>Role:</strong> ${roleText}</p>
            </div>

            <div style="margin: 30px 0;">
              <a href="${inviteLink}"
                 style="background: #2563eb; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px;
                        font-weight: bold; display: inline-block;">
                Accept invitation
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This invitation will expire in 7 days. If you did not request to join this team, please ignore this email.
            </p>
          </div>

          <div style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">
            <p>© 2025 MarkWeave. All rights reserved.</p>
            <p>If the button cannot be clicked, please copy the following link to your browser:</p>
            <p style="word-break: break-all;">${inviteLink}</p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    if (transporter) {
      // Real email sending
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } else {
      // Development mode: only show invite link
      console.log("📧 ===== Invitation email content (development mode) =====");
      console.log(`📮 Recipient: ${email}`);
      console.log(`📋 Team: ${teamName}`);
      console.log(`👤 Inviter: ${inviterName}`);
      console.log(`🔗 Invite link: ${inviteLink}`);
      console.log("📧 ===================================");
      console.log("💡 Copy the invite link above to browser to test invitation functionality");

      return {
        success: true,
        messageId: "dev-mode-" + Date.now(),
        inviteLink: inviteLink,
      };
    }
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Email sending failed: " + error.message);
  }
}

// Verify email configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log("✅ Email service configured correctly");
    return true;
  } catch (error) {
    console.error("❌ Email service configuration error:", error);
    return false;
  }
}
