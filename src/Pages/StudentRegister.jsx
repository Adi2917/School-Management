import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./StudentRegister.css";

export default function StudentRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    father_name: "",
    phone: "",
    school_code: "",
    class: "",
    section: "",
    roll: "",
    pin: "",
    address: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    show: false,
    type: "",
    message: "",
  });

  const createLocalId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  useEffect(() => {
    const code = form.school_code.trim();
    if (!code) {
      setSchoolProfile(null);
      return;
    }

    const registry = JSON.parse(localStorage.getItem("schoolRegistry") || "[]");
    const match = registry.find((item) => item.school_code === code);
    setSchoolProfile(match || null);
  }, [form.school_code]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    if (name === "pin") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 4) return;
    }

    setForm({ ...form, [name]: value });
  };

  const readImageAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Image read failed"));
      reader.readAsDataURL(file);
    });
  };

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });

    if (type === "success") {
      setTimeout(() => {
        navigate("/StudentLogin");
      }, 2500);
    } else {
      setTimeout(() => {
        setPopup({ show: false, type: "", message: "" });
      }, 2500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) return showPopup("error", "Please upload image");
    if (form.phone.length !== 10) return showPopup("error", "Phone must be 10 digits");
    if (form.pin.length !== 4) return showPopup("error", "PIN must be 4 digits");
    if (form.school_code.length !== 6) return showPopup("error", "School code must be 6 digits");

    const schoolRegistry = JSON.parse(localStorage.getItem("schoolRegistry") || "[]");
    const matchingSchool = schoolRegistry.find(
      (school) => school.school_code === form.school_code
    );

    if (!matchingSchool) {
      return showPopup("error", "School code not found");
    }

    const studentRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
    const alreadyExists = studentRegistry.some(
      (student) => student.school_code === form.school_code && student.number === form.phone
    );

    if (alreadyExists) {
      return showPopup("error", "Student already registered for this school");
    }

    setLoading(true);

    try {
      const imageDataUrl = await readImageAsDataUrl(imageFile);

      const payload = {
        id: createLocalId(),
        name: form.name,
        father_name: form.father_name,
        number: form.phone,
        school_code: form.school_code,
        school_name: matchingSchool.school_name,
        school_logo: matchingSchool.school_logo || "",
        class: form.class,
        section: form.section,
        roll: form.roll,
        pin: form.pin,
        address: form.address,
        photo_url: imageDataUrl,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("students").insert([payload]);

      if (error) {
        studentRegistry.push(payload);
        localStorage.setItem("studentRegistry", JSON.stringify(studentRegistry));
        setLoading(false);
        return showPopup("error", "Registration saved locally");
      }

      studentRegistry.push(payload);
      localStorage.setItem("studentRegistry", JSON.stringify(studentRegistry));
      setLoading(false);
      showPopup("success", "Registration Successful 🎉");
    } catch (err) {
      console.error(err);
      setLoading(false);
      showPopup("error", "Something went wrong");
    }
  };

  return (
    <div className="register-container">
      {popup.show && (
        <div className="popup-overlay">
          <div className={`popup-box ${popup.type}`}>{popup.message}</div>
        </div>
      )}

      <div className="register-card">
        <h2>Student Registration</h2>

        {schoolProfile && (
          <div className="school-preview-card">
            {schoolProfile.school_logo && (
              <img src={schoolProfile.school_logo} alt="school logo" className="school-preview-logo" />
            )}
            <div>
              <p className="preview-label">Joining</p>
              <h3>{schoolProfile.school_name}</h3>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Student Name" onChange={handleChange} required />
          <input name="father_name" placeholder="Father's Name" onChange={handleChange} required />
          <input name="phone" placeholder="Phone (10 digit)" value={form.phone} onChange={handleChange} required />
          <input
            name="school_code"
            placeholder="School Code"
            value={form.school_code}
            onChange={handleChange}
            required
          />

          <select name="class" onChange={handleChange} required>
            <option value="">Select Class</option>
            <option>Nursery</option>
            <option>LKG</option>
            <option>UKG</option>
            {[...Array(10)].map((_, i) => (
              <option key={i}>{i + 1}</option>
            ))}
          </select>

          <select name="section" onChange={handleChange} required>
            <option value="">Select Section</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>

          <input name="roll" placeholder="Roll Number" onChange={handleChange} required />
          <input name="pin" placeholder="4 Digit PIN" value={form.pin} onChange={handleChange} required />

          <textarea name="address" placeholder="Address" onChange={handleChange} required />

          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} required />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
