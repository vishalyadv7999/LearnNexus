const nodemailer = require("nodemailer");
const crypto = require("crypto");
const env = require("../config/env");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

let transporter = null;
let gmailAccessToken = null;
let gmailAccessTokenExpiresAt = 0;

const hasGmailApiConfig = () =>
  env.nodeEnv !== "test" &&
  Boolean(
    env.gmailClientId &&
      env.gmailClientSecret &&
      env.gmailRefreshToken &&
      env.gmailSenderEmail
  );

const hasSmtpConfig = () =>
  env.nodeEnv !== "test" && Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

const maskEmail = (email = "") => {
  const [local, domain] = String(email).split("@");
  if (!local || !domain) {
    return "<configured>";
  }

  return `${local.slice(0, 2)}***@${domain}`;
};

const toSafeEmailError = (error) => ({
  code: error?.code,
  command: error?.command,
  responseCode: error?.responseCode,
  message: String(error?.message || "Email delivery failed.")
    .replace(env.smtpPass || "__NO_EMAIL_PASS__", "<EMAIL_PASS>")
    .replace(env.smtpUser || "__NO_EMAIL_USER__", "<EMAIL_USER>"),
});

const getEmailFailureMessage = (error) => {
  const message = String(error?.message || "");

  if (
    error?.code === "EAUTH" ||
    error?.responseCode === 535 ||
    /Username and Password not accepted|Invalid login|BadCredentials/i.test(message)
  ) {
    return "The SMTP provider rejected EMAIL_USER or EMAIL_PASS. Check the SMTP login and SMTP key/password.";
  }

  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ESOCKET|EACCES/i.test(`${error?.code || ""} ${message}`)) {
    return "Could not reach the SMTP provider. Check SMTP_HOST, SMTP_PORT, and the hosting provider's outbound-port restrictions.";
  }

  return "Email delivery failed. Check the SMTP configuration.";
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
};

const canUseLocalDelivery = () => env.nodeEnv !== "production";

const encodeBase64Url = (value) =>
  Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getGmailAccessToken = async () => {
  if (gmailAccessToken && Date.now() < gmailAccessTokenExpiresAt) {
    return gmailAccessToken;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.gmailClientId,
      client_secret: env.gmailClientSecret,
      refresh_token: env.gmailRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const error = new Error(
      `Gmail OAuth token request failed (${response.status}): ${data.error_description || data.error || "unknown error"}`
    );
    error.code = data.error || "GMAIL_OAUTH_ERROR";
    throw error;
  }

  gmailAccessToken = data.access_token;
  gmailAccessTokenExpiresAt =
    Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000;
  return gmailAccessToken;
};

const buildRawEmail = ({ to, subject, text, html }) => {
  const boundary = `learnnexus_${crypto.randomBytes(12).toString("hex")}`;
  return [
    `From: ${env.mailFrom}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    `--${boundary}--`,
    "",
  ].join("\r\n");
};

const sendWithGmailApi = async (message) => {
  const accessToken = await getGmailAccessToken();
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw: encodeBase64Url(buildRawEmail(message)) }),
    }
  );
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      `Gmail API send failed (${response.status}): ${data.error?.message || "unknown error"}`
    );
    error.code = data.error?.status || "GMAIL_API_ERROR";
    throw error;
  }

  logger.info("Gmail API message accepted", {
    messageId: data.id,
    to: maskEmail(message.to),
  });
  return data;
};

const sendEmailMessage = async (message) => {
  if (hasGmailApiConfig()) {
    await sendWithGmailApi(message);
    return { delivered: true, mode: "gmail-api" };
  }

  const mailer = getTransporter();
  if (!mailer) {
    return null;
  }

  await mailer.sendMail({ from: env.mailFrom, ...message });
  return { delivered: true, mode: "smtp" };
};

const handleMissingMailer = (label) => {
  if (canUseLocalDelivery()) {
    return { delivered: false, mode: "console" };
  }

  logger.warn(`${label} email not sent because SMTP is not configured.`);
  throw new ApiError(502, "Email delivery is not configured.");
};

const verifyEmailTransport = async () => {
  if (hasGmailApiConfig()) {
    try {
      await getGmailAccessToken();
      logger.info("Gmail API authorization verified successfully", {
        sender: maskEmail(env.gmailSenderEmail),
      });
      return true;
    } catch (error) {
      logger.warn("Gmail API authorization failed; the API will start, but email delivery remains unavailable", {
        ...toSafeEmailError(error),
        guidance: "Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and Gmail API enablement.",
      });
      return false;
    }
  }

  const mailer = getTransporter();

  if (!mailer) {
    if (env.nodeEnv === "test") {
      return;
    }

    throw new Error(
      "Email delivery is not configured. Add SMTP_HOST, EMAIL_USER, and EMAIL_PASS in server/.env."
    );
  }

  try {
    await mailer.verify();
    logger.info("SMTP transport verified successfully", {
      host: env.smtpHost,
      port: env.smtpPort,
      user: maskEmail(env.smtpUser),
    });
  } catch (error) {
    logger.warn("SMTP transport verification failed; the API will start, but email delivery remains unavailable", {
      ...toSafeEmailError(error),
      guidance: getEmailFailureMessage(error),
    });
    return false;
  }

  return true;
};

const sendVerificationEmail = async ({ to, name, code }) => {
  if (!hasGmailApiConfig() && !getTransporter()) {
    if (canUseLocalDelivery()) {
      logger.info(`[LearnNexus verification] ${to}: ${code}`);
    }
    return handleMissingMailer("Verification");
  }

  try {
    const delivery = await sendEmailMessage({
      to,
      subject: "Verify your LearnNexus account",
      text: `Hi ${name},\n\nYour LearnNexus verification code is ${code}. It expires in 30 minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Verify your LearnNexus account</h2>
          <p>Hi ${escapeHtml(name)},</p>
          <p>Use this verification code to finish creating your account:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
          <p>This code expires in 30 minutes.</p>
        </div>
      `,
    });
    return delivery;
  } catch (error) {
    logger.error("Verification email failed", toSafeEmailError(error));
    throw new ApiError(502, getEmailFailureMessage(error));
  }

};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  if (!hasGmailApiConfig() && !getTransporter()) {
    if (canUseLocalDelivery()) {
      logger.info(`[LearnNexus password reset] ${to}: ${resetUrl}`);
    }
    return handleMissingMailer("Password reset");
  }

  try {
    const delivery = await sendEmailMessage({
      to,
      subject: "Reset your LearnNexus password",
      text: `Hi ${name},\n\nUse this secure link to reset your LearnNexus password:\n${resetUrl}\n\nIt expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your LearnNexus password</h2>
          <p>Hi ${escapeHtml(name)},</p>
          <p>Use this secure link to reset your password:</p>
          <p><a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700;">Reset password</a></p>
          <p>This link expires in 10 minutes.</p>
        </div>
      `,
    });
    return delivery;
  } catch (error) {
    logger.error("Password reset email failed", toSafeEmailError(error));
    throw new ApiError(502, getEmailFailureMessage(error));
  }

};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailTransport,
};
