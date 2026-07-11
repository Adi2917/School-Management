import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminDashboard.css";
import { BellRing, BookOpen, ChevronRight, GraduationCap, LayoutDashboard, LogOut, Search, ShieldCheck, Users } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  const classes = [
    "Nursery","LKG","UKG",
    "1","2","3","4","5","6","7","8","9","10"
  ];

  useEffect(() => {
    const schoolData = localStorage.getItem("schoolData");
    const adminData = localStorage.getItem("adminData");

    if (!schoolData && !adminData) {
      navigate("/SchoolLogin");
      return;
    }

    const activeSchool = JSON.parse(schoolData || adminData || "{}");
    setAdmin(activeSchool);
    setSchoolCode(activeSchool?.school_code || "");
  }, [navigate]);

  useEffect(() => {
    if (!schoolCode) return;
    supabase.from("students").select("*").eq("school_code", schoolCode).then(({ data }) => setAllStudents(data || []));
  }, [schoolCode]);

  // 🔥 Debounced realtime search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchTerm.trim() === "") {
        setStudents([]);
        return;
      }

      setLoading(true);

      const localMatches = allStudents.filter(
        (student) =>
          student.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setStudents(localMatches);
      setLoading(false);

    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm, allStudents]);

  const handleLogout = () => {
    localStorage.removeItem("adminData");
    localStorage.removeItem("schoolData");
    navigate("/Home");
  };

  if (!admin) return null;

  return (
    <div className="dashboard-wrapper">
      <div className="admin-command">
        <aside className="admin-command__rail">
          <div className="rail-logo"><BookOpen/></div><b>School<br/>Console</b>
          <nav><button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}><LayoutDashboard/> Overview</button><button className={activeTab === "students" ? "active" : ""} onClick={() => setActiveTab("students")}><Users/> Students</button><button onClick={() => navigate("/AdminStudentNotification")}><BellRing/> Notices</button></nav>
          <div className="rail-secure"><ShieldCheck/><small>Protected<br/>workspace</small></div>
        </aside>
        <section className="dashboard-card">
        <div className="admin-hero">
          <img src={admin?.school_logo || "/brand-mark.svg"} alt="Connect Your School" className="school-logo" />
          <div><span className="admin-kicker">SCHOOL ADMINISTRATION</span><h1 className="school-title">{admin?.school_name || "Connect Your School"}</h1><p className="admin-sub">Welcome back, {admin?.admin_name || "Administrator"}. Here is your school overview.</p></div>
          <span className="school-code-chip">CODE · {schoolCode}</span>
        </div>
        <div className="admin-stats">
          <article><span><Users/></span><div><b>{allStudents.length}</b><small>Total students</small></div></article>
          <article><span><GraduationCap/></span><div><b>{new Set(allStudents.map(s => s.class)).size}</b><small>Active classes</small></div></article>
          <article><span><BellRing/></span><div><b>Live</b><small>School updates</small></div></article>
        </div>

        {/* Search */}
        <div className="input-block">
          <Search className="field-icon"/><input
            type="text"
            className="search"
            placeholder="Search Student..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {(students.length > 0 || loading) && (
            <div className="search-dropdown">
              {loading && <div className="search-item">Searching...</div>}

              {!loading && students.length === 0 && (
                <div className="search-item">No student found</div>
              )}

              {!loading && students.map((student) => (
                <div
                  key={student.id}
                  className="search-item"
                  onClick={() =>
                    navigate(`/AdminStudentDashboard/${student.id}`)
                  }
                >
                  {student.name} • {student.class}-{student.section}
                </div>
              ))}
            </div>
          )}
        </div>

        {activeTab === "overview" ? <><div className="admin-section-title"><div><span>ACADEMIC DIRECTORY</span><h2>Browse classes</h2></div><small>Select a class to view students</small></div><div className="class-launcher">{classes.map((cls) => <button key={cls} onClick={() => navigate(`/AdminStudentClass/${cls}`)}><span>{["Nursery","LKG","UKG"].includes(cls) ? cls : `Class ${cls}`}</span><ChevronRight/></button>)}</div></> : <><div className="admin-section-title"><div><span>STUDENT DIRECTORY</span><h2>All students</h2></div><small>{allStudents.length} registered records</small></div><div className="student-directory"><div className="student-directory__head"><span>Student</span><span>Class</span><span>Section</span><span>Roll</span><span>Profile</span></div>{(searchTerm ? students : allStudents).map(student => <button key={student.id} onClick={() => navigate(`/AdminStudentDashboard/${student.id}`)}><span className="student-directory__person"><img src={student.photo_url || "/brand-mark.svg"} alt=""/><b>{student.name}</b></span><span>{student.class}</span><span>{student.section}</span><span>{student.roll}</span><span>View <ChevronRight/></span></button>)}{(searchTerm ? students : allStudents).length === 0 && <div className="student-directory__empty"><Users/><b>No students found</b><small>Registered students will appear here.</small></div>}</div></>}
        <div className="admin-actions"><button className="primary-btn" onClick={() => navigate("/AdminStudentNotification")}><BellRing/> Create notification</button><button className="logout-btn" onClick={handleLogout}><LogOut/> Logout</button></div>
        </section>
      </div>
    </div>
  );
}
