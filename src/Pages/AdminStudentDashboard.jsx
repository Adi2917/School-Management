import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminStudentDashboard.css";

export default function AdminStudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchStudent = async () => {
    const activeSchool = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");
    const localRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
    const selectedStudent = JSON.parse(localStorage.getItem("selectedStudent") || "{}");
    const localStudent = selectedStudent.id === id && selectedStudent.school_code === activeSchool.school_code ? selectedStudent : localRegistry.find((item) => item.id === id && item.school_code === activeSchool.school_code);

    if (localStudent) {
      setStudent(localStudent);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .eq("school_code", activeSchool.school_code)
        .single();

      if (!error && data) setStudent(data);
      else setErrorMessage("Student record could not be loaded");
    } catch {
      setErrorMessage("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  if (loading) return <div className="loading">Loading student...</div>;
  if (!student) return <div className="loading">{errorMessage || "Student not found"}<button onClick={() => navigate(-1)}>Go Back</button></div>;

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
