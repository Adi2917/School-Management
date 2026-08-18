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

export async function sendStudentPinOtp({ to, otp, studentName, schoolName }) {
  const school = escapeHtml(schoolName || "Your school");
  const student = escapeHtml(studentName || "Student");
  const senderName = String(schoolName || "Connect Your School").replace(/[\r\n"]/g, "").trim();
  await transporter().sendMail({
    from: `"${senderName} via Connect Your School" <${platformEmail}>`,
    replyTo: platformEmail,
    to,
    subject: `${school} - Reset PIN OTP`,
    text: `Hello ${student}, your ${school} PIN reset code is ${otp}. It expires in 5 minutes.`,
    html: `<div style="background:#f6f0e5;padding:32px;font-family:Arial,sans-serif;color:#242018"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #eadcc7;border-radius:22px;overflow:hidden"><div style="background:#242018;padding:24px;color:#fff"><div style="color:#f4b93a;font-size:12px;font-weight:800;letter-spacing:2px">SECURE STUDENT ACCESS</div><h1 style="margin:8px 0 0">${school}</h1></div><div style="padding:28px"><p>Hello <strong>${student}</strong>,</p><p><strong>${school}</strong> received a request to reset your student PIN. Use this secure code:</p><div style="font-size:38px;font-weight:900;letter-spacing:12px;text-align:center;background:#fff4d5;border-radius:16px;padding:20px;color:#242018">${otp}</div><p style="color:#6f675d">This code expires in 5 minutes. After expiry, request a new code using Resend OTP. If you did not request it, ignore this email.</p></div></div></div>`,
  });
}
