import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminDashboard.css";
import { BellRing, BookOpen, ChevronRight, Eye, EyeOff, GraduationCap, ImagePlus, LayoutDashboard, LogOut, Mail, MapPin, Phone, Save, Search, ShieldCheck, Trash2, Upload, UserCog, Users, X } from "lucide-react";
import { clearSession } from "../session";
import { uploadMedia } from "../mediaClient";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [newLogo, setNewLogo] = useState(null);
  const [logoMenu, setLogoMenu] = useState(false);
  const [logoViewer, setLogoViewer] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);

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
    setProfileForm(activeSchool);
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
    clearSession("admin");
    navigate("/Home");
  };
  const openStudent = (student) => { localStorage.setItem("selectedStudent", JSON.stringify(student)); navigate(`/AdminStudentDashboard/${student.id}`); };
  const saveAdminProfile = async () => {
    if (!/^\d{10}$/.test(String(profileForm.phone || ""))) return alert("Phone must contain exactly 10 digits");
    if (!/^\d{6}$/.test(String(profileForm.admin_pin || ""))) return alert("Admin PIN must contain exactly 6 digits");
    setProfileSaving(true);
    try {
      const school_logo = newLogo ? await uploadMedia(newLogo) : profileForm.school_logo;
      const changes = { school_name: profileForm.school_name?.trim(), admin_name: profileForm.admin_name?.trim(), email: profileForm.email?.trim(), phone: profileForm.phone, location: profileForm.location?.trim(), admin_pin: profileForm.admin_pin, school_logo };
      const { data, error } = await supabase.from("schools").update(changes).eq("school_code", schoolCode).select().single();
      if (error) throw error;
      const updated = data || { ...admin, ...changes };
      setAdmin(updated); setProfileForm(updated); setNewLogo(null);
      localStorage.setItem("schoolData", JSON.stringify(updated)); localStorage.setItem("adminData", JSON.stringify(updated));
      alert("Admin and school profile updated");
    } catch (error) { alert(error.message || "Profile update failed"); }
    finally { setProfileSaving(false); }
  };

  if (!admin) return null;

  return (
    <div className="dashboard-wrapper">
      <div className="admin-command">
        <aside className="admin-command__rail">
          <div className="rail-logo"><BookOpen/></div><b>School<br/>Console</b>
          <nav><button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}><LayoutDashboard/> Overview</button><button className={activeTab === "students" ? "active" : ""} onClick={() => setActiveTab("students")}><Users/> Students</button><button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}><UserCog/> Admin profile</button><button onClick={() => navigate("/AdminStudentNotification")}><BellRing/> Notices</button></nav>
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

        {activeTab !== "profile" && <>{/* Search */}
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
                  onClick={() => openStudent(student)}
                >
                  {student.name} • {student.class}-{student.section}
                </div>
              ))}
            </div>
          )}
        </div>

        {activeTab === "overview" ? <><div className="admin-section-title"><div><span>ACADEMIC DIRECTORY</span><h2>Browse classes</h2></div><small>Select a class to view students</small></div><div className="class-launcher">{classes.map((cls) => <button key={cls} onClick={() => navigate(`/AdminStudentClass/${cls}`)}><span>{["Nursery","LKG","UKG"].includes(cls) ? cls : `Class ${cls}`}</span><ChevronRight/></button>)}</div></> : <><div className="admin-section-title"><div><span>STUDENT DIRECTORY</span><h2>All students</h2></div><small>{allStudents.length} registered records</small></div><div className="student-directory"><div className="student-directory__head"><span>Student</span><span>Class</span><span>Section</span><span>Roll</span><span>Profile</span></div>{(searchTerm ? students : allStudents).map(student => <button key={student.id} onClick={() => openStudent(student)}><span className="student-directory__person"><img src={student.photo_url || "/brand-mark.svg"} alt=""/><b>{student.name}</b></span><span>{student.class}</span><span>{student.section}</span><span>{student.roll}</span><span>View <ChevronRight/></span></button>)}{(searchTerm ? students : allStudents).length === 0 && <div className="student-directory__empty"><Users/><b>No students found</b><small>Registered students will appear here.</small></div>}</div></>}</>}
        {activeTab === "profile" && <section className="admin-profile-panel"><div className="admin-section-title"><div><span>ACCOUNT & SCHOOL</span><h2>Admin profile</h2></div><small>All changes stay linked to code {schoolCode}</small></div><div className="admin-profile-brand"><button type="button" className="admin-logo-button" onClick={()=>setLogoMenu(true)}><img src={newLogo ? URL.createObjectURL(newLogo) : profileForm.school_logo || "/brand-mark.svg"} alt="School logo"/></button><label><Upload/> Change school logo<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setNewLogo(e.target.files?.[0] || null)}/></label></div><div className="admin-profile-form"><label><span><BookOpen/>School name</span><input value={profileForm.school_name || ""} onChange={e => setProfileForm({...profileForm,school_name:e.target.value})}/></label><label><span><UserCog/>Admin name</span><input value={profileForm.admin_name || ""} onChange={e => setProfileForm({...profileForm,admin_name:e.target.value})}/></label><label><span><Mail/>Email</span><input type="email" value={profileForm.email || ""} onChange={e => setProfileForm({...profileForm,email:e.target.value})}/></label><label><span><Phone/>Phone</span><input inputMode="numeric" maxLength="10" value={profileForm.phone || ""} onChange={e => setProfileForm({...profileForm,phone:e.target.value.replace(/\D/g,"")})}/></label><label><span><ShieldCheck/>Admin PIN</span><span className="admin-pin-input"><input type={showAdminPin?"text":"password"} inputMode="numeric" maxLength="6" value={profileForm.admin_pin || ""} onChange={e => setProfileForm({...profileForm,admin_pin:e.target.value.replace(/\D/g,"")})}/><button type="button" onClick={()=>setShowAdminPin(value=>!value)}>{showAdminPin?<EyeOff/>:<Eye/>}</button></span></label><label><span><ShieldCheck/>School code</span><input value={schoolCode} readOnly/></label><label className="admin-location"><span><MapPin/>School address</span><textarea value={profileForm.location || ""} onChange={e => setProfileForm({...profileForm,location:e.target.value})}/></label></div><button className="save-admin-profile" disabled={profileSaving} onClick={saveAdminProfile}><Save/>{profileSaving ? "Saving profile…" : "Save profile changes"}</button></section>}
        {logoMenu && <div className="media-action-sheet" onMouseDown={()=>setLogoMenu(false)}><section className="media-action-card" onMouseDown={event=>event.stopPropagation()}><small>SCHOOL LOGO</small><h2>Choose an action</h2><div className="media-action-list"><button onClick={()=>{setLogoMenu(false);setLogoViewer(true)}}><Eye/> View logo</button><label><ImagePlus/> Add or change logo<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{setNewLogo(event.target.files?.[0]||null);setLogoMenu(false)}}/></label><button className="danger" onClick={()=>{setNewLogo(null);setProfileForm({...profileForm,school_logo:""});setLogoMenu(false)}}><Trash2/> Remove logo</button><button onClick={()=>setLogoMenu(false)}><X/> Cancel</button></div></section></div>}
        {logoViewer && <div className="image-lightbox" onMouseDown={()=>setLogoViewer(false)}><img src={newLogo?URL.createObjectURL(newLogo):profileForm.school_logo||"/brand-mark.svg"} alt="School logo" onMouseDown={event=>event.stopPropagation()}/><button onClick={()=>setLogoViewer(false)}><X/></button></div>}
        <div className="admin-actions"><button className="primary-btn" onClick={() => navigate("/AdminStudentNotification")}><BellRing/> Create notification</button><button className="logout-btn" onClick={handleLogout}><LogOut/> Logout</button></div>
        </section>
      </div>
    </div>
  );
}
