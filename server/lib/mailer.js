/* global process */
import nodemailer from "nodemailer";

const transporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Email service is not configured");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

const escapeHtml = value => String(value || "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

export async function sendStudentPinOtp({ to, otp, studentName, schoolName }) {
  const school = escapeHtml(schoolName || "Your school");
  const student = escapeHtml(studentName || "Student");
  await transporter().sendMail({
    from: process.env.SMTP_FROM || `Connect Your School <${process.env.SMTP_USER}>`,
    to,
    subject: `${school} – student PIN reset code`,
    text: `Hello ${student}, your ${school} PIN reset code is ${otp}. It expires in 10 minutes.`,
    html: `<div style="background:#f6f0e5;padding:32px;font-family:Arial,sans-serif;color:#242018"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #eadcc7;border-radius:22px;overflow:hidden"><div style="background:#242018;padding:24px;color:#fff"><div style="color:#f4b93a;font-size:12px;font-weight:800;letter-spacing:2px">CONNECTED SCHOOL</div><h1 style="margin:8px 0 0">${school}</h1></div><div style="padding:28px"><p>Hello <strong>${student}</strong>,</p><p>Use this secure code to reset your student PIN:</p><div style="font-size:38px;font-weight:900;letter-spacing:12px;text-align:center;background:#fff4d5;border-radius:16px;padding:20px;color:#242018">${otp}</div><p style="color:#6f675d">This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p></div></div></div>`,
  });
}
