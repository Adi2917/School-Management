import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { uploadMedia } from "../mediaClient";
import EducationPanel from "../Components/EducationPanel";
import "./StudentRegister.css";

const syncSchoolRegistry = (school) => {
  const current = JSON.parse(localStorage.getItem("schoolRegistry") || "[]");
  const updated = current.filter((item) => item.school_code !== school.school_code);
  updated.push(school);
  localStorage.setItem("schoolRegistry", JSON.stringify(updated));
};

export default function SchoolRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    school_name: "",
    admin_name: "",
    email: "",
    phone: "",
    school_code: "",
    admin_pin: "",
    location: "",
  });
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    show: false,
    type: "",
    message: "",
  });

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });
    setTimeout(() => {
      setPopup({ show: false, type: "", message: "" });
    }, 2600);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    if (name === "school_code" || name === "admin_pin") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 6) return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSchoolLogo(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.phone.length !== 10) {
      return showPopup("error", "Phone must be 10 digits");
    }

    if (form.school_code.length !== 6) {
      return showPopup("error", "School code must be 6 digits");
    }

    if (form.admin_pin.length !== 6) {
      return showPopup("error", "Admin pin must be 6 digits");
    }

    const { data: existingSchool } = await supabase
      .from("schools").select("*").eq("school_code", form.school_code).single();
    const alreadyExists = Boolean(existingSchool);

    if (alreadyExists) {
      return showPopup("error", "This school code already exists");
    }

    setLoading(true);

    try {
      const uploadedLogo = schoolLogo ? await uploadMedia(schoolLogo) : "";
      const payload = { ...form, school_logo: uploadedLogo, created_at: new Date().toISOString() };
      const { error } = await supabase.from("schools").insert([payload]);

      if (!error) {
        syncSchoolRegistry(payload);
        localStorage.setItem("schoolData", JSON.stringify(payload));
        localStorage.setItem(
          "adminData",
          JSON.stringify({
            email: payload.email,
            admin_name: payload.admin_name,
            school_name: payload.school_name,
            school_code: payload.school_code,
            admin_pin: payload.admin_pin,
          })
        );
        setLoading(false);
        showPopup("success", "Your school registration is done successfully");
        setTimeout(() => navigate("/SchoolLogin"), 1800);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
    showPopup("error", "Registration failed. Check the server and try again");
  };

  return (
    <div className="register-container">
      <EducationPanel mode="school" />
      {popup.show && (
        <div className="popup-overlay">
          <div className={`popup-box ${popup.type}`}>{popup.message}</div>
        </div>
      )}

      <div className="register-card">
        <h2>School Registration</h2>

        <form onSubmit={handleSubmit}>
          <input
            name="school_name"
            placeholder="School Name"
            onChange={handleChange}
            required
          />
          <input
            name="admin_name"
            placeholder="Admin Name"
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Admin Email"
            onChange={handleChange}
            required
          />
          <input
            name="phone"
            placeholder="Phone (10 digit)"
            value={form.phone}
            onChange={handleChange}
            required
          />
          <input
            name="school_code"
            placeholder="6 Digit School Code"
            value={form.school_code}
            onChange={handleChange}
            required
          />
          <input
            name="admin_pin"
            placeholder="Admin Pin (6 digits)"
            value={form.admin_pin}
            onChange={handleChange}
            required
          />
          <textarea
            name="location"
            placeholder="School Address / Location"
            onChange={handleChange}
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
