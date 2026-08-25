import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCollectionAnalytics, supabase } from "../supabaseClient";
import "./AdminDashboard.css";
import { BellRing, BookOpen, ChevronRight, Eye, ImagePlus, LayoutDashboard, LogOut, Mail, MapPin, Phone, ReceiptIndianRupee, Save, Search, ShieldCheck, Trash2, Upload, UserCog, Users, X } from "lucide-react";
import { clearSession } from "../session";
import { uploadMedia } from "../mediaClient";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

function CollectionPanel(){const [range,setRange]=useState("monthly"),[from,setFrom]=useState(""),[to,setTo]=useState(""),[data,setData]=useState(null),[error,setError]=useState("");const load=async next=>{const selected=next||range;if(selected==="custom"&&(!from||!to))return;setError("");try{setData(await getCollectionAnalytics({range:selected,...(selected==="custom"?{from,to}:{})}));}catch(caught){setError(caught.message)}};useEffect(()=>{load("monthly")},[]);const choose=value=>{setRange(value);if(value!=="custom")load(value)};return <section className="collection-panel"><div className="admin-section-title"><div><span>FINANCE INSIGHTS</span><h2>Total collection</h2></div><small>Calculated from paid fee ledger entries</small></div><div className="collection-filters">{["daily","weekly","monthly","custom"].map(value=><button key={value} className={range===value?"active":""} onClick={()=>choose(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>{range==="custom"&&<div className="collection-dates"><label>From<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>To<input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label><button onClick={()=>load("custom")}>Apply dates</button></div>}{error&&<p className="collection-error">{error}</p>}<div className="collection-metrics"><article><small>TOTAL COLLECTED</small><strong>₹{Number(data?.total||0).toLocaleString("en-IN")}</strong><span>{data?.entries||0} paid entries</span></article><article><small>MONTHLY FEES</small><strong>₹{Number(data?.monthly||0).toLocaleString("en-IN")}</strong><span>Tuition collection</span></article><article><small>EXAM FEES</small><strong>₹{Number(data?.exam||0).toLocaleString("en-IN")}</strong><span>Assessment collection</span></article></div></section>}

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
  const [examDraft,setExamDraft]=useState({name:"",type:"",class_amounts:{}});

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
    setProfileForm({ ...activeSchool, admin_pin: "" });
    setSchoolCode(activeSchool?.school_code || "");
  }, [navigate]);

  useEffect(() => {
    if (!schoolCode) return;
    const refreshStudents = () => Promise.all([supabase.from("students").select("*").eq("school_code", schoolCode),supabase.from("schools").select("*").eq("school_code",schoolCode).single()]).then(([{data},{data:school}])=>{setAllStudents(data||[]);if(school){setAdmin(school);setProfileForm(current=>({...school,admin_pin:current.admin_pin||""}));localStorage.setItem("schoolData",JSON.stringify(school));localStorage.setItem("adminData",JSON.stringify(school));}});
    refreshStudents();
    window.addEventListener("focus", refreshStudents);
    return () => { window.removeEventListener("focus", refreshStudents); };
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
    if (profileForm.admin_pin && !/^\d{6}$/.test(String(profileForm.admin_pin))) return alert("New admin PIN must contain exactly 6 digits");
    setProfileSaving(true);
    try {
      const school_logo = newLogo ? await uploadMedia(newLogo) : profileForm.school_logo;
      const changes = { school_name: profileForm.school_name?.trim(), admin_name: profileForm.admin_name?.trim(), email: profileForm.email?.trim(), phone: profileForm.phone, location: profileForm.location?.trim(), school_logo, monthly_fees:profileForm.monthly_fees||{}, exam_fees:profileForm.exam_fees||[], ...(profileForm.admin_pin ? { admin_pin: profileForm.admin_pin } : {}) };
      const { data, error } = await supabase.from("schools").update(changes).eq("school_code", schoolCode).select().single();
      if (error) throw error;
      const { error: studentSyncError } = await supabase.from("students").update({ school_name: changes.school_name, school_logo }).eq("school_code", schoolCode);
      if (studentSyncError) throw studentSyncError;
      const updated = data || { ...admin, ...changes };
      setAdmin(updated); setProfileForm({ ...updated, admin_pin: "" }); setNewLogo(null);
      localStorage.setItem("schoolData", JSON.stringify(updated)); localStorage.setItem("adminData", JSON.stringify(updated));
      setAllStudents(current => current.map(student => ({ ...student, school_name: changes.school_name, school_logo })));
      alert("School profile and every connected student updated");
    } catch (error) { alert(error.message || "Profile update failed"); }
    finally { setProfileSaving(false); }
  };
  const addExamFee=()=>{if(!examDraft.name.trim()||!examDraft.type.trim()||classes.some(item=>examDraft.class_amounts[item]===""||examDraft.class_amounts[item]===undefined))return alert("Enter exam name, type and amount for every class");setProfileForm(current=>({...current,exam_fees:[...(current.exam_fees||[]),{id:String(Date.now()),name:examDraft.name.trim(),type:examDraft.type.trim(),class_amounts:Object.fromEntries(classes.map(item=>[item,Number(examDraft.class_amounts[item])]))}]}));setExamDraft({name:"",type:"",class_amounts:{}})};

  if (!admin) return null;

  return (
    <div className="dashboard-wrapper">
      <div className="admin-command">
        <aside className="admin-command__rail">
          <div className="rail-logo"><BookOpen/></div><b>School<br/>Console</b>
          <nav><button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}><LayoutDashboard/> Overview</button><button className={activeTab === "students" ? "active" : ""} onClick={() => setActiveTab("students")}><Users/> Students</button><button className={activeTab === "finance" ? "active" : ""} onClick={() => setActiveTab("finance")}><ReceiptIndianRupee/> Finance</button><button className={activeTab === "fees" ? "active" : ""} onClick={() => setActiveTab("fees")}><ReceiptIndianRupee/> Fee setup</button><button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}><UserCog/> Admin profile</button><button onClick={() => navigate("/AdminStudentNotification")}><BellRing/> Notices</button></nav>
          <div className="rail-secure"><ShieldCheck/><small>Protected<br/>workspace</small></div>
        </aside>
        <section className="dashboard-card">
        <div className="admin-hero">
          <img src={admin?.school_logo || "/brand-mark.svg"} alt="Connect Your School" className="school-logo" />
          <div><span className="admin-kicker">SCHOOL ADMINISTRATION</span><h1 className="school-title">{admin?.school_name || "Connect Your School"}</h1><p className="admin-sub">Welcome back, {admin?.admin_name || "Administrator"}. Here is your school overview.</p></div>
          <span className="school-code-chip">CODE · {schoolCode}</span>
        </div>
        {activeTab === "finance" && <CollectionPanel/>}
        {activeTab !== "profile" && activeTab !== "fees" && activeTab !== "finance" && <>{/* Search */}
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
        {activeTab === "profile" && <section className="admin-profile-panel"><div className="admin-section-title"><div><span>ACCOUNT & SCHOOL</span><h2>Admin profile</h2></div><small>All changes stay linked to code {schoolCode}</small></div><div className="admin-profile-brand"><button type="button" className="admin-logo-button" onClick={()=>setLogoMenu(true)}><img src={newLogo ? URL.createObjectURL(newLogo) : profileForm.school_logo || "/brand-mark.svg"} alt="School logo"/></button><label><Upload/> Change school logo<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setNewLogo(e.target.files?.[0] || null)}/></label></div><div className="admin-profile-form"><label><span><BookOpen/>School name</span><input value={profileForm.school_name || ""} onChange={e => setProfileForm({...profileForm,school_name:e.target.value})}/></label><label><span><UserCog/>Admin name</span><input value={profileForm.admin_name || ""} onChange={e => setProfileForm({...profileForm,admin_name:e.target.value})}/></label><label><span><Mail/>Email</span><input type="email" value={profileForm.email || ""} onChange={e => setProfileForm({...profileForm,email:e.target.value})}/></label><label><span><Phone/>Phone</span><input inputMode="numeric" maxLength="10" value={profileForm.phone || ""} onChange={e => setProfileForm({...profileForm,phone:e.target.value.replace(/\D/g,"")})}/></label><label><span><ShieldCheck/>New admin PIN</span><span className="admin-pin-input"><input type="password" inputMode="numeric" maxLength="6" placeholder="Leave blank to keep current PIN" value={profileForm.admin_pin || ""} onChange={e => setProfileForm({...profileForm,admin_pin:e.target.value.replace(/\D/g,"")})}/></span></label><label><span><ShieldCheck/>School code</span><input value={schoolCode} readOnly/></label><label className="admin-location"><span><MapPin/>School address</span><textarea value={profileForm.location || ""} onChange={e => setProfileForm({...profileForm,location:e.target.value})}/></label></div><button className="save-admin-profile" disabled={profileSaving} onClick={saveAdminProfile}><Save/>{profileSaving ? "Saving profile…" : "Save profile changes"}</button></section>}
        {logoMenu && <div className="media-action-sheet" onMouseDown={()=>setLogoMenu(false)}><section className="media-action-card" onMouseDown={event=>event.stopPropagation()}><small>SCHOOL LOGO</small><h2>Choose an action</h2><div className="media-action-list"><button onClick={()=>{setLogoMenu(false);setLogoViewer(true)}}><Eye/> View logo</button><label><ImagePlus/> Add or change logo<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{setNewLogo(event.target.files?.[0]||null);setLogoMenu(false)}}/></label><button className="danger" onClick={()=>{setNewLogo(null);setProfileForm({...profileForm,school_logo:""});setLogoMenu(false)}}><Trash2/> Remove logo</button><button onClick={()=>setLogoMenu(false)}><X/> Cancel</button></div></section></div>}
        {logoViewer && <div className="image-lightbox" onMouseDown={()=>setLogoViewer(false)}><img src={newLogo?URL.createObjectURL(newLogo):profileForm.school_logo||"/brand-mark.svg"} alt="School logo" onMouseDown={event=>event.stopPropagation()}/><button onClick={()=>setLogoViewer(false)}><X/></button></div>}
        {activeTab === "fees" && <section className="admin-profile-panel school-fee-setup"><div className="admin-section-title"><div><span>FINANCE CONFIGURATION</span><h2>School fee setup</h2></div><small>Shared by website and app</small></div><h3>Monthly Fee Structure</h3>{classes.map(item=><label key={item}><span>{["Nursery","LKG","UKG"].includes(item)?item:`Class ${item}`}</span><input inputMode="numeric" placeholder="Amount ₹" value={profileForm.monthly_fees?.[item]??""} onChange={e=>setProfileForm(current=>({...current,monthly_fees:{...(current.monthly_fees||{}),[item]:e.target.value.replace(/\D/g,"")}}))}/></label>)}<h3>Exam Fee Setup</h3><input placeholder="Exam name" value={examDraft.name} onChange={e=>setExamDraft({...examDraft,name:e.target.value})}/><input placeholder="Exam type" value={examDraft.type} onChange={e=>setExamDraft({...examDraft,type:e.target.value})}/>{classes.map(item=><label key={item}><span>{["Nursery","LKG","UKG"].includes(item)?item:`Class ${item}`}</span><input inputMode="numeric" placeholder="Amount ₹" value={examDraft.class_amounts[item]??""} onChange={e=>setExamDraft(current=>({...current,class_amounts:{...current.class_amounts,[item]:e.target.value.replace(/\D/g,"")}}))}/></label>)}<button type="button" className="save-admin-profile" onClick={addExamFee}>Add exam fee</button>{(profileForm.exam_fees||[]).map(item=><article key={item.id}><b>{item.name}</b> · <span>{item.type}</span> <button type="button" onClick={()=>setProfileForm(current=>({...current,exam_fees:current.exam_fees.filter(fee=>fee.id!==item.id)}))}>Remove</button></article>)}<button className="save-admin-profile" disabled={profileSaving} onClick={saveAdminProfile}><Save/>{profileSaving?"Saving…":"Save all fee settings"}</button></section>}
        <div className="admin-actions"><button className="primary-btn" onClick={() => navigate("/AdminStudentNotification")}><BellRing/> Create notification</button><button className="logout-btn" onClick={handleLogout}><LogOut/> Logout</button></div>
        </section>
      </div>
    </div>
  );
}
