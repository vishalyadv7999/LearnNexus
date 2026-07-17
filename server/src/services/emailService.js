const nodemailer = require("nodemailer");
const env = require("../config/env");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

let transporter = null;

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

const handleMissingMailer = (label) => {
  if (canUseLocalDelivery()) {
    return { delivered: false, mode: "console" };
  }

  logger.warn(`${label} email not sent because SMTP is not configured.`);
  throw new ApiError(502, "Email delivery is not configured.");
};

const verifyEmailTransport = async () => {
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
  const mailer = getTransporter();

  if (!mailer) {
    if (canUseLocalDelivery()) {
      logger.info(`[LearnNexus verification] ${to}: ${code}`);
    }
    return handleMissingMailer("Verification");
  }

  try {
    await mailer.sendMail({
      from: env.mailFrom,
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
  } catch (error) {
    logger.error("Verification email failed", toSafeEmailError(error));
    throw new ApiError(502, getEmailFailureMessage(error));
  }

  return { delivered: true, mode: "smtp" };
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const mailer = getTransporter();

  if (!mailer) {
    if (canUseLocalDelivery()) {
      logger.info(`[LearnNexus password reset] ${to}: ${resetUrl}`);
    }
    return handleMissingMailer("Password reset");
  }

  try {
    await mailer.sendMail({
      from: env.mailFrom,
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
  } catch (error) {
    logger.error("Password reset email failed", toSafeEmailError(error));
    throw new ApiError(502, getEmailFailureMessage(error));
  }

  return { delivered: true, mode: "smtp" };
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailTransport,
};
