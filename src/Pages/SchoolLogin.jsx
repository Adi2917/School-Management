import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authLogin } from "../supabaseClient";
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

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
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

        <form onSubmit={handleLogin}>
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
          <PinInput
            name="admin_pin"
            inputMode="numeric"
            maxLength="6"
            placeholder="6 Digit Admin PIN"
            value={form.admin_pin}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Checking..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
