const nodemailer = require("nodemailer");

const emailUser = process.env.EMAIL_USER?.trim();
const emailPass = process.env.EMAIL_PASS?.trim();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

/**
 * Send an email with optional HTML template and PDF attachments
 */
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  if (!emailUser || !emailPass) {
    console.warn("⚠️ Email ENV vars (EMAIL_USER, EMAIL_PASS) missing. Skipping email.");
    return { success: false, reason: "Missing credentials" };
  }

  try {
    const mailOptions = {
      from: `"AgriNex Vertical Farming" <${emailUser}>`,
      to,
      subject,
      text: text || "AgriNex Farm Statement",
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to} (MessageId: ${info.messageId})`);
    return { success: true, info };
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { transporter, sendEmail };
