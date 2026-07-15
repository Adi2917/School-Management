import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, FileChartColumn, GraduationCap, MapPin, Phone, ReceiptIndianRupee, School, UserRound, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import "./AdminStudentDashboard.css";

export default function AdminStudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoOpen, setPhotoOpen] = useState(false);
  const activeSchool = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");

  useEffect(() => {
    let alive = true;

    const loadWorkspace = async () => {
      const selected = JSON.parse(localStorage.getItem("selectedStudent") || "{}");
      const [studentResult, schoolResult] = await Promise.all([
        supabase.from("students").select("*").eq("id", id).eq("school_code", activeSchool.school_code).single(),
        supabase.from("schools").select("*").eq("school_code", activeSchool.school_code).single(),
      ]);

      if (!alive) return;
      if (schoolResult.data) setSchool(schoolResult.data);
      if (studentResult.data) {
        setStudent(studentResult.data);
        setError("");
        localStorage.setItem("selectedStudent", JSON.stringify(studentResult.data));
      } else if (selected.id === id && selected.school_code === activeSchool.school_code) {
        setStudent(selected);
      } else {
        setError("Student record could not be loaded");
      }
      setLoading(false);
    };

    loadWorkspace();
    window.addEventListener("focus", loadWorkspace);
    const refreshTimer = window.setInterval(loadWorkspace, 10000);
    return () => {
      alive = false;
      window.removeEventListener("focus", loadWorkspace);
      window.clearInterval(refreshTimer);
    };
  }, [id, activeSchool.school_code]);

  if (loading) return <div className="workspace-loading"><span></span><b>Opening student workspace…</b></div>;
  if (!student) return <div className="workspace-error">{error || "Student not found"}<button onClick={() => navigate(-1)}>Go back</button></div>;
  const initials = (student.name || "Student").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const actions = [
    { title: "Student profile", copy: "View and update personal, security and academic information.", icon: UserRound, path: `/StudentProfile/${student.id}` },
    { title: "Fee ledger", copy: "Manage monthly payment status and paid dates.", icon: ReceiptIndianRupee, path: `/AdminStudentFees/${student.id}` },
    { title: "Exam results", copy: "Create, publish, edit and review examination results.", icon: FileChartColumn, path: `/AdminStudentResult/${student.id}` },
  ];
  const currentSchoolName = school?.school_name || activeSchool.school_name || student.school_name;
  const currentSchoolLogo = school?.school_logo || activeSchool.school_logo || student.school_logo || "/brand-mark.svg";

  return <main className="student-record-shell">
    <header className="record-school-bar"><img src={currentSchoolLogo} alt="School logo"/><div><small>SCHOOL STUDENT RECORD · CODE {student.school_code}</small><h2>{currentSchoolName}</h2></div><School/></header>
    <section className="student-record-hero"><div className="record-photo"><button className="record-avatar-button" onClick={() => student.photo_url && setPhotoOpen(true)} aria-label="View student photo">{student.photo_url ? <img src={student.photo_url} alt={student.name}/> : <span className="record-avatar-initials">{initials}</span>}</button><span><GraduationCap/></span></div><div className="record-identity"><small>ENROLLED STUDENT</small><h1>{student.name}</h1><p>{student.father_name ? `S/O ${student.father_name}` : "Verified school student"}</p><div className="record-tags"><span><GraduationCap/> Class {student.class}-{student.section}</span><span>Roll {student.roll}</span></div></div><div className="record-contact"><span><Phone/><b>{student.number || "—"}</b></span><span><MapPin/><b>{student.address || "Address not added"}</b></span></div></section>
    <section className="record-actions"><div className="record-section-heading"><div><small>STUDENT MANAGEMENT</small><h2>Academic workspace</h2></div><p>Select an area to continue managing this student.</p></div><div className="record-action-grid">{actions.map(({ title, copy, icon: Icon, path }) => <button key={title} onClick={() => navigate(path)}><span><Icon/></span><div><h3>{title}</h3><p>{copy}</p></div><ArrowRight/></button>)}</div></section>
    <footer className="record-footer"><GraduationCap/> All information is linked to {currentSchoolName}.</footer>
    {photoOpen && student.photo_url && <div className="image-lightbox" onMouseDown={() => setPhotoOpen(false)}><img src={student.photo_url} alt={student.name} onMouseDown={event => event.stopPropagation()}/><button onClick={() => setPhotoOpen(false)} aria-label="Close photo"><X/></button></div>}
  </main>;
}
