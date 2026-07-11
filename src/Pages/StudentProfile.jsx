import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FaEdit } from "react-icons/fa";
import "./StudentProfile.css";

export default function StudentProfile() {
  // ✅ FIXED PARAM NAME
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState(null);
  const [newValue, setNewValue] = useState("");

  // ================= FETCH STUDENT =================
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const localRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
        const localStudent = localRegistry.find((item) => item.id === id);

        if (localStudent) {
          setStudent(localStudent);
          return;
        }

        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        setStudent(data);
      } catch (err) {
        console.error("Error fetching student:", err);

        const localRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
        const localStudent = localRegistry.find((item) => item.id === id);

        if (localStudent) {
          setStudent(localStudent);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStudent();
    }
  }, [id]);

  // ================= EDIT CLICK =================
  const handleEditClick = (field) => {
    setEditField(field);
    setNewValue(student[field]);
  };

  // ================= SAVE UPDATE =================
  const handleSave = async () => {
    try {
      const localRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
      const updatedStudent = { ...student, [editField]: newValue };
      const updatedRegistry = localRegistry.map((item) =>
        item.id === id ? updatedStudent : item
      );

      localStorage.setItem("studentRegistry", JSON.stringify(updatedRegistry));
      localStorage.setItem("studentData", JSON.stringify(updatedStudent));

      const { data, error } = await supabase
        .from("students")
        .update({ [editField]: newValue })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setStudent(data || updatedStudent);
      setEditField(null);
      setNewValue("");
    } catch (err) {
      console.error("Error updating student:", err);

      const localRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
      const updatedStudent = { ...student, [editField]: newValue };
      const updatedRegistry = localRegistry.map((item) =>
        item.id === id ? updatedStudent : item
      );

      localStorage.setItem("studentRegistry", JSON.stringify(updatedRegistry));
      localStorage.setItem("studentData", JSON.stringify(updatedStudent));
      setStudent(updatedStudent);
      setEditField(null);
      setNewValue("");
    }
  };

  // ================= LOADING =================
  if (loading) return <div className="loading">Loading...</div>;
  if (!student) return <div className="loading">Student not found!</div>;

  const fields = [
    { label: "Name", key: "name" },
    { label: "Father's Name", key: "father_name" },
    { label: "Class", key: "class" },
    { label: "Section", key: "section" },
    { label: "Roll No", key: "roll" },
    { label: "Contact Number", key: "number" },
    { label: "Address", key: "address" },
  ];

  return (
    <div className="profile-modal">
      {/* Backdrop */}
      <div
        className="profile-backdrop"
        onClick={() => navigate(-1)}
      ></div>

      <div className="profile-card">
        <button
          className="close-btn"
          onClick={() => navigate(-1)}
        >
          ×
        </button>

        {/* Photo */}
        <div className="profile-photo">
          <img src={student.photo_url || "/brand-mark.svg"} alt={student.name} />
        </div>

        {/* Detail rows */}
        {fields.map((field) => (
          <div className="profile-row" key={field.key}>
            <span className="label">{field.label}:</span>

            {editField === field.key ? (
              <>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
                <button
                  className="save-btn"
                  onClick={handleSave}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <span className="value">
                  {student[field.key]}
                </span>
                <FaEdit
                  className="edit-icon"
                  onClick={() => handleEditClick(field.key)}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
