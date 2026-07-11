import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BellRing, BookOpen, CalendarDays, FileChartColumn, GraduationCap, LogOut, ReceiptIndianRupee, Sparkles } from "lucide-react";
import "./StudentDashboard.css";
import { clearSession } from "../session";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student] = useState(() => {
    const stored = localStorage.getItem("studentData");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (!student) navigate("/StudentLogin");
  }, [navigate, student]);

  if (!student) return null;

  const handleLogout = () => {
    localStorage.removeItem("studentData");
    clearSession("student");
    navigate("/Home");
  };

  return (
    <div className="dashboard-container">
      <div className="student-welcome"><div><span><Sparkles/> STUDENT WORKSPACE</span><h1>Good to see you, {student.name?.split(" ")[0]}.</h1><p>Everything from your classroom, organized in one calm place.</p></div><div className="student-date"><CalendarDays/><span><small>TODAY</small><b>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</b></span></div></div>
      <div className="dashboard-top">
        <div className="profile-section">
          <div className="profile-left">
            <img
              src={student.photo_url || "/brand-mark.svg"}
              alt="Student"
              className="profile-image"
            />
          </div>

          <div className="profile-right">
            <span className="profile-label"><GraduationCap/> STUDENT PROFILE</span>
            <h2>{student.name}</h2>
            <div className="student-meta"><span><small>CLASS</small><b>{student.class} - {student.section}</b></span><span><small>ROLL NUMBER</small><b>{student.roll}</b></span><span><small>SCHOOL</small><b>{student.school_name || "My School"}</b></span></div>

            <button
              className="detail-btn"
              onClick={() =>
                navigate(`/StudentProfile/${student.id}`) // ✅ pass UUID
              }
            >
              View profile <ArrowRight/>
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="student-section-title"><span>MY SCHOOL</span><h2>Academic essentials</h2></div>
        <div className="student-services">
          <button onClick={() => navigate(`/StudentFees/${student.id}`)}><span className="service-icon"><ReceiptIndianRupee/></span><div><small>PAYMENTS</small><b>Fees & receipts</b><p>Review monthly fee status and payment dates.</p></div><ArrowRight/></button>
          <button onClick={() => navigate(`/StudentResult/${student.id}`)}><span className="service-icon"><FileChartColumn/></span><div><small>ACADEMICS</small><b>Exam results</b><p>View marks, percentages and print your result.</p></div><ArrowRight/></button>
          <button onClick={() => navigate(`/StudentNotification/${student.id}`)}><span className="service-icon"><BellRing/></span><div><small>NOTICE BOARD</small><b>School updates</b><p>Never miss announcements from your school.</p></div><ArrowRight/></button>
        </div>
        <div className="student-dashboard-foot"><span><BookOpen/> Learn something meaningful today.</span><button className="logout-btn" onClick={handleLogout}><LogOut/> Logout securely</button></div>
      </div>
    </div>
  );
}
