import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BellRing, BookOpen, CalendarDays, Edit3, FileChartColumn, GraduationCap, KeyRound, LogOut, ReceiptIndianRupee, School, Sparkles, X } from "lucide-react";
import "./StudentDashboard.css";
import { clearSession } from "../session";
import { getApiSubject, supabase } from "../supabaseClient";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(() => { const saved=JSON.parse(localStorage.getItem("studentData")||"null"); return saved&&!saved.id?{...saved,id:getApiSubject()}:saved; });
  const [editingPin, setEditingPin] = useState(false);
  const [, setPinValue] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [viewImage, setViewImage] = useState(null);

  useEffect(() => { if (!student) navigate("/StudentLogin"); }, [navigate, student]);
  useEffect(() => {
    if (!student?.id || !student?.school_code) return;
    let mounted = true;
    const refresh = async () => {
      const [{ data: latestStudent }, { data: latestSchool }] = await Promise.all([
        supabase.from("students").select("*").eq("id", student.id).eq("school_code", student.school_code).single(),
        supabase.from("schools").select("*").eq("school_code", student.school_code).single(),
      ]);
      if (!mounted || !latestStudent) return;
      const updated = { ...latestStudent, school_name: latestSchool?.school_name || latestStudent.school_name, school_logo: latestSchool?.school_logo || "" };
      setStudent(updated); localStorage.setItem("studentData", JSON.stringify(updated));
    };
    refresh(); const timer = window.setInterval(refresh, 10000); window.addEventListener("focus", refresh);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [student?.id, student?.school_code]);

  if (!student) return null;
  const studentInitials = (student.name || "Student").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const handleLogout = () => { localStorage.removeItem("studentData"); clearSession("student"); navigate("/Home"); };
  const savePin = () => { setSavingPin(true); setPinValue(""); localStorage.removeItem("studentData"); clearSession("student"); navigate("/StudentLogin"); };

  return <div className="dashboard-container">
    <div className="student-welcome"><div><span><Sparkles/> STUDENT WORKSPACE</span><h1>Good to see you, {student.name?.split(" ")[0]}.</h1><p>Everything from your classroom, organized in one calm place.</p></div><div className="student-date"><CalendarDays/><span><small>TODAY</small><b>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b></span></div></div>
    <div className="student-school-banner"><button className="student-school-banner__logo" onClick={() => student.school_logo && setViewImage({ src: student.school_logo, alt: student.school_name || "School logo" })}>{student.school_logo ? <img src={student.school_logo} alt="School logo"/> : <School/>}</button><div><small>MY SCHOOL</small><h2>{student.school_name || "My School"}</h2><p>Class {student.class}-{student.section} · Roll {student.roll}</p></div><span><GraduationCap/> Proud learner</span></div>
    <div className="dashboard-top"><div className="profile-section"><div className="profile-left"><button className="dashboard-photo-button" onClick={() => student.photo_url && setViewImage({ src: student.photo_url, alt: student.name })}>{student.photo_url ? <img src={student.photo_url} alt="Student" className="profile-image"/> : <span className="profile-image profile-image-initials">{studentInitials}</span>}</button></div><div className="profile-right"><span className="profile-label"><GraduationCap/> STUDENT PROFILE</span><h2>{student.name}</h2><div className="student-meta"><span><small>CLASS</small><b>{student.class} - {student.section}</b></span><span><small>ROLL NUMBER</small><b>{student.roll}</b></span><span><small>SCHOOL</small><b>{student.school_name || "My School"}</b></span><span className="student-pin-meta"><small><KeyRound/> STUDENT PIN</small><b>Protected</b><button type="button" onClick={() => { setPinValue(""); setEditingPin(true); }} aria-label="Change student PIN"><Edit3/></button></span></div><button type="button" className="detail-btn" onClick={() => navigate(`/StudentProfile/${student.id}`)}>View profile <ArrowRight/></button></div></div></div>
    <div className="dashboard-bottom"><div className="student-section-title"><span>MY SCHOOL</span><h2>Academic essentials</h2></div><div className="student-services"><button onClick={() => navigate(`/StudentFees/${student.id}`)}><span className="service-icon"><ReceiptIndianRupee/></span><div><small>PAYMENTS</small><b>Fees & receipts</b><p>Review monthly fee status and payment dates.</p></div><ArrowRight/></button><button onClick={() => navigate(`/StudentResult/${student.id}`)}><span className="service-icon"><FileChartColumn/></span><div><small>ACADEMICS</small><b>Exam results</b><p>View marks, percentages and print your result.</p></div><ArrowRight/></button><button onClick={() => navigate(`/StudentNotification/${student.id}`)}><span className="service-icon"><BellRing/></span><div><small>NOTICE BOARD</small><b>School updates</b><p>Never miss announcements from your school.</p></div><ArrowRight/></button></div><div className="student-dashboard-foot"><span><BookOpen/> Learn something meaningful today.</span><button className="logout-btn" onClick={handleLogout}><LogOut/> Logout securely</button></div></div>
    {editingPin && <div className="functional-modal" onMouseDown={() => setEditingPin(false)}><div onMouseDown={event => event.stopPropagation()}><small>SECURE PIN RESET</small><h2>Reset through registered email</h2><p>For your safety, PIN changes require the 4-digit OTP sent to your registered email.</p><div><button onClick={() => setEditingPin(false)}>Cancel</button><button disabled={savingPin} onClick={savePin}>{savingPin ? "Opening…" : "Continue to OTP reset"}</button></div></div></div>}
    {viewImage && <div className="image-lightbox" onMouseDown={() => setViewImage(null)}><img src={viewImage.src} alt={viewImage.alt} onMouseDown={event => event.stopPropagation()}/><button onClick={() => setViewImage(null)}><X/></button></div>}
  </div>;
}
