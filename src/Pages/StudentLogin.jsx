import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authLogin, requestStudentPinReset, resetStudentPin } from "../supabaseClient";
import "./StudentLogin.css";
import EducationPanel from "../Components/EducationPanel";
import { saveSession } from "../session";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [schoolCode, setSchoolCode] = useState("");
  const [number, setNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false), [email,setEmail]=useState(""), [otp,setOtp]=useState(""), [newPin,setNewPin]=useState(""), [otpSent,setOtpSent]=useState(false);
  const [otpSeconds,setOtpSeconds]=useState(0);
  const [popup, setPopup] = useState({ show: false, type: "", message: "" });

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "", message: "" }), 2500);
  };
  useEffect(()=>{if(!otpSeconds)return;const timer=window.setInterval(()=>setOtpSeconds(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer)},[otpSeconds]);
  const handleReset = async event => { event.preventDefault(); setLoading(true); try { if(!otpSent||otpSeconds===0){await requestStudentPinReset({school_code:schoolCode,number,email});setOtpSent(true);setOtpSeconds(300);setOtp("");showPopup("success","A 4-digit OTP was sent by your school. Valid for 5 minutes.");}else{await resetStudentPin({school_code:schoolCode,number,email,otp,pin:newPin});setResetMode(false);setOtpSent(false);setOtpSeconds(0);setOtp("");setNewPin("");showPopup("success","PIN reset complete");}}catch(error){showPopup("error",error.message)}finally{setLoading(false)} };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(schoolCode)) return showPopup("error", "Enter valid 6 digit school code");
    if (!/^\d{10}$/.test(number)) return showPopup("error", "Enter valid 10 digit number");
    if (!/^\d{4}$/.test(pin)) return showPopup("error", "Enter valid 4 digit PIN");
    setLoading(true);
    try {
      const student = await authLogin("student", { school_code: schoolCode, number, pin });
      localStorage.removeItem("studentRegistry");
      localStorage.setItem("studentData", JSON.stringify(student));
      saveSession("student");
      showPopup("success", "Login successful");
      setTimeout(() => navigate("/StudentDashboard"), 700);
    } catch (error) {
      showPopup("error", error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <EducationPanel mode="student" />
      {popup.show && <div className="popup-overlay"><div className={`popup-box ${popup.type}`}>{popup.message}</div></div>}
      <div className="login-card">
        <h2>Student Login</h2>
        <form onSubmit={resetMode ? handleReset : handleLogin}>
          <input type="text" placeholder="Enter School Code" inputMode="numeric" maxLength="6" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value.replace(/\D/g, ""))} required />
          <input type="text" placeholder="Enter Registered Number" inputMode="numeric" maxLength="10" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} required />
          {!resetMode && <input type="password" placeholder="Enter 4 Digit PIN" inputMode="numeric" maxLength="4" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required />}
          {resetMode && <><input type="email" placeholder="Registered email" value={email} onChange={e=>setEmail(e.target.value)} required/>{otpSent&&otpSeconds>0&&<><div className="otp-timer">OTP valid for <b>{String(Math.floor(otpSeconds/60)).padStart(2,"0")}:{String(otpSeconds%60).padStart(2,"0")}</b></div><input placeholder="4 digit OTP" inputMode="numeric" maxLength="4" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} required/><input type="password" placeholder="New 4 digit PIN" inputMode="numeric" maxLength="4" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))} required/></>}</>}
          <button type="submit" disabled={loading}>{loading ? "Please wait..." : resetMode ? !otpSent||otpSeconds===0 ? otpSent?"Resend OTP":"Send secure OTP" : "Verify OTP & reset PIN" : "Login"}</button>
          <button type="button" className="text-action" onClick={()=>{setResetMode(!resetMode);setOtpSent(false);setOtpSeconds(0)}}>{resetMode ? "Back to login" : "Forgot PIN? Reset with email OTP"}</button>
        </form>
      </div>
    </div>
  );
}
