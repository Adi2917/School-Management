import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authLogin, supabase } from "../supabaseClient";
import { uploadMedia } from "../mediaClient";
import EducationPanel from "../Components/EducationPanel";
import PinInput from "../Components/PinInput";
import { saveSession } from "../session";
import "./StudentRegister.css";

const classes = ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10"];

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
  const [monthlyFees, setMonthlyFees] = useState(Object.fromEntries(classes.map(item => [item, ""])));
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
    if (classes.some(item => monthlyFees[item] === "" || Number(monthlyFees[item]) < 0)) return showPopup("error", "Enter monthly fee for every class");

    setLoading(true);

    const { data: existingSchool } = await supabase
      .from("schools").select("*").eq("school_code", form.school_code).single();
    const alreadyExists = Boolean(existingSchool);

    if (alreadyExists) {
      setLoading(false);
      return showPopup("error", "This school code already exists");
    }

    try {
      const uploadedLogo = schoolLogo ? await uploadMedia(schoolLogo) : "";
      const payload = { ...form, admin_email: form.email.trim().toLowerCase(), email: form.email.trim().toLowerCase(), school_logo: uploadedLogo, monthly_fees: Object.fromEntries(classes.map(item => [item, Number(monthlyFees[item])])), exam_fees: [], created_at: new Date().toISOString() };
      const { data: created, error } = await supabase.from("schools").insert([payload]);

      if (!error) {
        const authenticated = await authLogin("admin", { school_code:payload.school_code,pin:payload.admin_pin });
        const safeSchool = authenticated || created?.[0];
        syncSchoolRegistry(safeSchool);
        localStorage.setItem("schoolData", JSON.stringify(safeSchool));
        saveSession("admin");
        localStorage.setItem("adminData", JSON.stringify(safeSchool));
        setLoading(false);
        showPopup("success", "Your school registration is done successfully");
        setTimeout(() => navigate("/AdminDashboard", { replace:true }), 900);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
    showPopup("error", "Registration failed. Check the server and try again");
  };

  return (
    <div className="register-container school-onboarding">
      <EducationPanel mode="school" />
      {popup.show && (
        <div className="popup-overlay">
          <div className={`popup-box ${popup.type}`}>{popup.message}</div>
        </div>
      )}

      <div className="register-card school-register-card">
        <div className="registration-heading"><span>CREATE YOUR SCHOOL WORKSPACE</span><h2>School Registration</h2><p>Add school details and set the fee structure once. You can edit it later from the admin profile.</p></div>

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
          <PinInput
            name="admin_pin"
            placeholder="Admin Pin (6 digits)"
            value={form.admin_pin}
            onChange={handleChange}
            required
          />
          <textarea className="form-wide"
            name="location"
            placeholder="School Address / Location"
            onChange={handleChange}
            required
          />
          <div className="school-fee-setup"><h3>Monthly Fee Structure</h3><p>Set the default monthly fee once for Nursery through Class 10.</p>{classes.map(item => <label key={item}><span>{["Nursery","LKG","UKG"].includes(item) ? item : `Class ${item}`}</span><input inputMode="numeric" placeholder="Amount ₹" value={monthlyFees[item]} onChange={event => setMonthlyFees(current => ({...current,[item]:event.target.value.replace(/\D/g,"")}))} required/></label>)}</div>
          <label className="logo-upload"><b>School logo</b><small>JPG, PNG or WebP</small><input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
          /></label>

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
