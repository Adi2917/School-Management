import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authLogin, requestAdminPinReset, resetAdminPin } from "../supabaseClient";
import "./StudentLogin.css";
import EducationPanel from "../Components/EducationPanel";
import { clearSession, saveSession } from "../session";
import PinInput from "../Components/PinInput";

export default function SchoolLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    school_code: "",
    admin_pin: "",
  });
  const [loading, setLoading] = useState(false);
  const [resetMode,setResetMode]=useState(false),[email,setEmail]=useState(""),[otp,setOtp]=useState(""),[newPin,setNewPin]=useState(""),[otpSent,setOtpSent]=useState(false),[otpSeconds,setOtpSeconds]=useState(0);
  const [popup, setPopup] = useState({
    show: false,
    type: "",
    message: "",
  });

  useEffect(() => {
    clearSession("admin");
    localStorage.removeItem("schoolData");
    localStorage.removeItem("adminData");
  }, []);
  useEffect(()=>{if(!otpSeconds)return;const timer=window.setInterval(()=>setOtpSeconds(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer)},[otpSeconds]);

  const showPopup = (type, message) => {
    const finalMessage=type==="success"&&/OTP/i.test(message)?`${message} If it is not in Inbox, check Spam once and mark it Not spam.`:message;
    setPopup({ show: true, type, message:finalMessage });
    setTimeout(() => {
      setPopup({ show: false, type: "", message: "" });
    }, 2500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = name === "school_code" || name === "admin_pin" ? value.replace(/\D/g, "").slice(0, 6) : value;
    setForm({ ...form, [name]: next });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.school_code)) return showPopup("error", "School code must contain exactly 6 digits");
    if (!/^\d{6}$/.test(form.admin_pin)) return showPopup("error", "Admin PIN must contain exactly 6 digits");
    setLoading(true);

    try {
      const school = await authLogin("admin", {
        school_code: form.school_code,
        pin: form.admin_pin,
      });
      localStorage.removeItem("schoolRegistry");
      localStorage.setItem("adminData", JSON.stringify(school));
      localStorage.setItem("schoolData", JSON.stringify(school));
      saveSession("admin");
      setLoading(false);
      showPopup("success", "School login successful");
      setTimeout(() => navigate("/AdminDashboard"), 1000);
    } catch (err) {
      console.error(err);
      setLoading(false);
      showPopup("error", err.message || "Invalid school credentials");
    }
  };
  const handleReset=async event=>{event.preventDefault();if(!/^\d{6}$/.test(form.school_code))return showPopup("error","Enter a valid 6 digit school code");if(!/^\S+@\S+\.\S+$/.test(email))return showPopup("error","Enter the registered admin email");setLoading(true);try{if(!otpSent||otpSeconds===0){await requestAdminPinReset({school_code:form.school_code,email});setOtpSent(true);setOtpSeconds(300);setOtp("");showPopup("success","4-digit OTP sent. It is valid for 5 minutes.");}else{if(!/^\d{4}$/.test(otp)||!/^\d{6}$/.test(newPin))throw new Error("Enter the 4-digit OTP and a new 6-digit PIN");await resetAdminPin({school_code:form.school_code,email,otp,pin:newPin});setResetMode(false);setOtpSent(false);setOtpSeconds(0);setOtp("");setNewPin("");showPopup("success","Admin PIN reset complete");}}catch(error){showPopup("error",error.message)}finally{setLoading(false)}};

  return (
    <div className="login-container">
      <EducationPanel mode="school" />
      {popup.show && (
        <div className="popup-overlay">
          <div className={`popup-box ${popup.type}`}>{popup.message}</div>
        </div>
      )}

      <div className="login-card">
        <h2>School Login</h2>

        <form onSubmit={resetMode?handleReset:handleLogin}>
          <input
            type="text"
            name="school_code"
            inputMode="numeric"
            maxLength="6"
            placeholder="School Code"
            value={form.school_code}
            onChange={handleChange}
            required
          />
          {!resetMode&&<PinInput
            name="admin_pin"
            inputMode="numeric"
            maxLength="6"
            placeholder="6 Digit Admin PIN"
            value={form.admin_pin}
            onChange={handleChange}
            required
          />}
          {resetMode&&<><input type="email" placeholder="Registered admin email" value={email} onChange={event=>setEmail(event.target.value)} required/>{otpSent&&otpSeconds>0&&<><div className="otp-timer">OTP valid for <b>{String(Math.floor(otpSeconds/60)).padStart(2,"0")}:{String(otpSeconds%60).padStart(2,"0")}</b></div><input placeholder="4 digit OTP" inputMode="numeric" maxLength="4" value={otp} onChange={event=>setOtp(event.target.value.replace(/\D/g,"").slice(0,4))} required/><PinInput placeholder="New 6 digit Admin PIN" inputMode="numeric" maxLength="6" value={newPin} onChange={event=>setNewPin(event.target.value.replace(/\D/g,"").slice(0,6))} required/></>}</>}

          <button type="submit" disabled={loading}>
            {loading?"Please wait...":resetMode?(!otpSent||otpSeconds===0?(otpSent?"Resend OTP":"Send secure OTP"):"Verify OTP & reset PIN"):"Login"}
          </button>
          <button type="button" className="text-action" onClick={()=>{setResetMode(value=>!value);setOtpSent(false);setOtpSeconds(0);setPopup({show:false,type:"",message:""})}}>{resetMode?"Back to login":"Forgot Admin PIN? Reset with email OTP"}</button>
        </form>
      </div>
    </div>
  );
}
