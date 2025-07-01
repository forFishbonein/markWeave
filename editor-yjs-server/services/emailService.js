import nodemailer from "nodemailer";
import crypto from "crypto";

// 邮件配置 - 使用环境变量或测试账户
let transporter;

// 检查是否启用真实邮件发送（需要明确设置ENABLE_REAL_EMAIL=true）
if (
  process.env.ENABLE_REAL_EMAIL === "true" &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
) {
  // 使用真实SMTP配置
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("📧 真实邮件模式已启用");
} else {
  // 开发模式：不发送真实邮件
  console.log("⚠️  开发模式：邮件不会真实发送，将在控制台显示邀请链接");
  transporter = null;
}

// 生成邀请令牌
export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

// 发送团队邀请邮件
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

  const roleText = role === "admin" ? "管理员" : "成员";

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `邀请加入团队：${teamName}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">MarkWeave 团队邀请</h1>

          <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">你被邀请加入团队</h2>

            <div style="text-align: left; margin: 20px 0;">
              <p><strong>团队名称:</strong> ${teamName}</p>
              <p><strong>邀请人:</strong> ${inviterName}</p>
              <p><strong>角色:</strong> ${roleText}</p>
            </div>

            <div style="margin: 30px 0;">
              <a href="${inviteLink}"
                 style="background: #2563eb; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 6px;
                        font-weight: bold; display: inline-block;">
                接受邀请
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              此邀请将在7天后过期。如果你没有申请加入此团队，请忽略此邮件。
            </p>
          </div>

          <div style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">
            <p>© 2025 MarkWeave. All rights reserved.</p>
            <p>如果按钮无法点击，请复制以下链接到浏览器：</p>
            <p style="word-break: break-all;">${inviteLink}</p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    if (transporter) {
      // 真实邮件发送
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ 邮件发送成功:", info.messageId);
      return { success: true, messageId: info.messageId };
    } else {
      // 开发模式：只显示邀请链接
      console.log("📧 ===== 邀请邮件内容 (开发模式) =====");
      console.log(`📮 收件人: ${email}`);
      console.log(`📋 团队: ${teamName}`);
      console.log(`👤 邀请人: ${inviterName}`);
      console.log(`🔗 邀请链接: ${inviteLink}`);
      console.log("📧 ===================================");
      console.log("💡 复制上面的邀请链接到浏览器中测试邀请功能");

      return {
        success: true,
        messageId: "dev-mode-" + Date.now(),
        inviteLink: inviteLink,
      };
    }
  } catch (error) {
    console.error("❌ 邮件发送失败:", error);
    throw new Error("邮件发送失败: " + error.message);
  }
}

// 验证邮件配置
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log("✅ 邮件服务配置正确");
    return true;
  } catch (error) {
    console.error("❌ 邮件服务配置错误:", error);
    return false;
  }
}
