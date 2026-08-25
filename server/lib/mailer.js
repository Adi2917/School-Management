/* global process */
import nodemailer from "nodemailer";

const platformEmail = process.env.SMTP_USER;

const transporter = () => {
  if (!platformEmail || !process.env.SMTP_PASS) {
    const error = new Error("Connect Your School OTP mailbox is not configured");
    error.statusCode = 503;
    throw error;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: platformEmail, pass: process.env.SMTP_PASS },
  });
};

const escapeHtml = value => String(value || "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

async function sendPinOtp({ to, otp, recipientName, schoolName, role }) {
  const school = escapeHtml(schoolName || "Your school");
  const recipient = escapeHtml(recipientName || (role === "admin" ? "Administrator" : "Student"));
  const accessLabel = role === "admin" ? "SCHOOL ADMIN ACCESS" : "SECURE STUDENT ACCESS";
  const accountLabel = role === "admin" ? "admin" : "student";
  await transporter().sendMail({
    from: `"Connect Your School" <${platformEmail}>`,
    replyTo: platformEmail,
    to,
    subject: `${school} | ${role === "admin" ? "Admin " : ""}PIN reset code`,
    text: `Hello ${recipient},\n\nUse ${otp} to reset your ${school} ${accountLabel} PIN. This code expires in 5 minutes.\n\nIf you did not request this, ignore this email.\n\nConnect Your School`,
    html: `<div style="background:#f6f0e5;padding:32px 14px;font-family:Arial,sans-serif;color:#242018"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #eadcc7;border-radius:22px;overflow:hidden"><div style="background:#242018;padding:24px;color:#fff"><div style="color:#f4b93a;font-size:12px;font-weight:800;letter-spacing:2px">${accessLabel}</div><h1 style="margin:8px 0 0">${school}</h1></div><div style="padding:28px"><p>Hello <strong>${recipient}</strong>,</p><p>Use this one-time code to reset your <strong>${accountLabel} PIN</strong>:</p><div style="font-size:38px;font-weight:900;letter-spacing:12px;text-align:center;background:#fff4d5;border-radius:16px;padding:20px;color:#242018">${otp}</div><p style="color:#6f675d;line-height:1.6">This code expires in 5 minutes. After expiry, request a new code using Resend OTP. If you did not request it, ignore this email.</p><p style="margin-top:24px;font-weight:700">Connect Your School</p></div></div></div>`,
  });
}

export const sendStudentPinOtp = details => sendPinOtp({ ...details, recipientName: details.studentName, role: "student" });
export const sendAdminPinOtp = details => sendPinOtp({ ...details, recipientName: details.adminName, role: "admin" });
