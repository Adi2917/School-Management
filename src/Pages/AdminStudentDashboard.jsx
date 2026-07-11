import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminStudentDashboard.css";

export default function AdminStudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    fetchStudent();
  }, []);

  const fetchStudent = async () => {
    const localRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
    const localStudent = localRegistry.find((item) => item.id === id);

    if (localStudent) {
      setStudent(localStudent);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) setStudent(data);
    } catch {
      setStudent(null);
    }
  };

  if (!student) return <div className="loading">Loading...</div>;

  return (
    <div className="student-dashboard-wrapper">

      {/* Upper Half */}
      <div className="student-top">

        <div className="student-image-box">
          <img
            src={student.photo_url || "/brand-mark.svg"}
            alt="student"
          />
        </div>

        <div className="student-info">
          <h2>{student.name}</h2>
          <div className="class-roll">
            <span>Class: {student.class}</span>
            <span>Roll: {student.roll}</span>
          </div>

          <button
            className="detail-btn"
            onClick={() => navigate(`/StudentProfile/${student.id}`)}
          >
            View Detail
          </button>
        </div>

      </div>

      {/* Lower Half */}
      <div className="student-bottom">

        <div
          className="card fees-card"
          onClick={() => navigate(`/AdminStudentFees/${student.id}`)}
        >
          <h3>Fees</h3>
          <p>View & Manage Student Fees</p>
        </div>

        <div
          className="card result-card"
          onClick={() => navigate(`/AdminStudentResult/${student.id}`)}
        >
          <h3>Result</h3>
          <p>Upload & Check Student Result</p>
        </div>

      </div>

    </div>
  );
}
