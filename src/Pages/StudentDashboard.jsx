import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BellRing, BookOpen, CalendarDays, Edit3, Eye, EyeOff, FileChartColumn, GraduationCap, KeyRound, LogOut, ReceiptIndianRupee, School, Sparkles } from "lucide-react";
import "./StudentDashboard.css";
import { clearSession } from "../session";
import { supabase } from "../supabaseClient";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(() => {
    const stored = localStorage.getItem("studentData");
    return stored ? JSON.parse(stored) : null;
  });
  const [showPin, setShowPin] = useState(false);
  const [editingPin, setEditingPin] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (!student) navigate("/StudentLogin");
  }, [navigate, student]);

  if (!student) return null;
  const studentInitials = (student.name || "Student").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("studentData");
    clearSession("student");
    navigate("/Home");
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(pinValue)) return alert("Student PIN must contain exactly 4 digits");
    setSavingPin(true);
    const { data, error } = await supabase.from("students").update({ pin: pinValue }).eq("id", student.id).eq("school_code", student.school_code).select().single();
    setSavingPin(false);
    if (error) return alert(error.message || "PIN update failed");
    const updated = data || { ...student, pin: pinValue };
    setStudent(updated); localStorage.setItem("studentData", JSON.stringify(updated));
    setEditingPin(false); setShowPin(true);
  };

  return (
    <div className="dashboard-container">
      <div className="student-welcome"><div><span><Sparkles/> STUDENT WORKSPACE</span><h1>Good to see you, {student.name?.split(" ")[0]}.</h1><p>Everything from your classroom, organized in one calm place.</p></div><div className="student-date"><CalendarDays/><span><small>TODAY</small><b>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</b></span></div></div>
      <div className="student-school-banner"><div className="student-school-banner__logo">{student.school_logo ? <img src={student.school_logo} alt=""/> : <School/>}</div><div><small>MY SCHOOL</small><h2>{student.school_name || "My School"}</h2><p>Class {student.class}-{student.section} · Roll {student.roll}</p></div><span><GraduationCap/> Proud learner</span></div>
      <div className="dashboard-top">
        <div className="profile-section">
          <div className="profile-left">
            {student.photo_url ? <img src={student.photo_url} alt="Student" className="profile-image"/> : <span className="profile-image profile-image-initials">{studentInitials}</span>}
          </div>

          <div className="profile-right">
            <span className="profile-label"><GraduationCap/> STUDENT PROFILE</span>
            <h2>{student.name}</h2>
            <div className="student-meta"><span><small>CLASS</small><b>{student.class} - {student.section}</b></span><span><small>ROLL NUMBER</small><b>{student.roll}</b></span><span><small>SCHOOL</small><b>{student.school_name || "My School"}</b></span><span className="student-pin-meta"><small><KeyRound/> STUDENT PIN</small><b>{showPin ? student.pin : "••••"}</b><button type="button" onClick={() => setShowPin(value => !value)} aria-label={showPin ? "Hide PIN" : "Show PIN"}>{showPin ? <EyeOff/> : <Eye/>}</button><button type="button" onClick={() => { setPinValue(student.pin || ""); setEditingPin(true); }} aria-label="Edit PIN"><Edit3/></button></span></div>

            <button
              type="button"
              className="detail-btn"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                navigate(`/StudentProfile/${student.id}`);
              }}
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
      {editingPin && <div className="functional-modal" onMouseDown={() => setEditingPin(false)}><div onMouseDown={event => event.stopPropagation()}><small>SECURITY</small><h2>Change student PIN</h2><input autoFocus type="password" inputMode="numeric" maxLength="4" placeholder="Enter 4 digit PIN" value={pinValue} onChange={event => setPinValue(event.target.value.replace(/\D/g, ""))}/><div><button onClick={() => setEditingPin(false)}>Cancel</button><button disabled={savingPin} onClick={savePin}>{savingPin ? "Saving…" : "Update PIN"}</button></div></div></div>}
    </div>
  );
}
