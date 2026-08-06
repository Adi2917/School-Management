import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authLogin } from "../supabaseClient";
import "./StudentLogin.css";
import EducationPanel from "../Components/EducationPanel";
import { saveSession } from "../session";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [schoolCode, setSchoolCode] = useState("");
  const [number, setNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ show: false, type: "", message: "" });

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => setPopup({ show: false, type: "", message: "" }), 2500);
  };

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
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Enter School Code" inputMode="numeric" maxLength="6" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value.replace(/\D/g, ""))} required />
          <input type="text" placeholder="Enter Registered Number" inputMode="numeric" maxLength="10" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} required />
          <input type="password" placeholder="Enter 4 Digit PIN" inputMode="numeric" maxLength="4" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required />
          <button type="submit" disabled={loading}>{loading ? "Checking..." : "Login"}</button>
        </form>
      </div>
    </div>
  );
}
