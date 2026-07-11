import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMoneyBillWave, FaFileAlt, FaBell } from "react-icons/fa";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const data = localStorage.getItem("studentData");

    if (!data) {
      navigate("/StudentLogin");
    } else {
      setStudent(JSON.parse(data));
    }
  }, [navigate]);

  if (!student) return null;

  const handleLogout = () => {
    localStorage.removeItem("studentData");
    navigate("/Home");
  };

  return (
    <div className="dashboard-container">
      {/* TOP HALF */}
      <div className="dashboard-top">
        <div className="profile-section">
          <div className="profile-left">
            <img
              src={student.photo_url || "/logo.png"}
              alt="Student"
              className="profile-image"
            />
          </div>

          <div className="profile-right">
            <h2>{student.name}</h2>
            <p>Class: {student.class}</p>
            <p>Roll No: {student.roll}</p>

            <button
              className="detail-btn"
              onClick={() =>
                navigate(`/StudentProfile/${student.id}`) // ✅ pass UUID
              }
            >
              View Detail
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM HALF */}
      <div className="dashboard-bottom">
        {/* Top Row: Fees + Result */}
        <div className="top-row">
          <div className="menu-card" onClick={() => navigate(`/StudentFees/${student.id}`)}>
            <FaMoneyBillWave size={30} className="icon" />
            <span>Fees</span>
          </div>

          <div className="menu-card" onClick={() => navigate(`/StudentResult/${student.id}`)}>
            <FaFileAlt size={30} className="icon" />
            <span>Result</span>
          </div>
        </div>

        {/* Middle Row: Notification */}
        <div className="middle-row">
          <div
            className="menu-card notification-card"
            onClick={() => navigate(`/StudentNotification/${student.id}`)}
          >
            <FaBell size={35} className="icon" />
            <span>Notification</span>
          </div>
        </div>

        {/* Bottom Row: Logout */}
        <div className="bottom-row">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
