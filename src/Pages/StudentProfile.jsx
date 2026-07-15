import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { uploadMedia } from "../mediaClient";
import { Edit3, Eye, GraduationCap, ImagePlus, KeyRound, MapPin, Phone, School, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import "./StudentProfile.css";

const fields = [
  { label: "Student name", key: "name", icon: UserRound },
  { label: "Father's name", key: "father_name", icon: UserRound },
  { label: "Class", key: "class", icon: GraduationCap },
  { label: "Section", key: "section", icon: GraduationCap },
  { label: "Roll number", key: "roll", icon: ShieldCheck },
  { label: "Contact number", key: "number", icon: Phone },
  { label: "Student PIN", key: "pin", icon: KeyRound },
  { label: "Address", key: "address", icon: MapPin },
];

const initials = name => (name || "Student").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [student, setStudent] = useState(null);
  const [school, setSchool] = useState({});
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(false);

  useEffect(() => { (async () => {
    const cached = JSON.parse(localStorage.getItem("studentData") || "{}");
    let record = cached.id === id ? cached : null;
    if (!record) { const { data } = await supabase.from("students").select("*").eq("id", id).single(); record = data; }
    setStudent(record);
    if (record) { const { data } = await supabase.from("schools").select("*").eq("school_code", record.school_code).single(); setSchool(data || {}); }
    setLoading(false);
  })(); }, [id]);

  const cacheStudent = updated => {
    setStudent(updated);
    const active = JSON.parse(localStorage.getItem("studentData") || "{}");
    if (active.id === id) localStorage.setItem("studentData", JSON.stringify(updated));
    const registry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
    localStorage.setItem("studentRegistry", JSON.stringify(registry.map(item => item.id === id ? updated : item)));
    localStorage.setItem("selectedStudent", JSON.stringify(updated));
  };
  const patchStudent = async changes => {
    const { data, error } = await supabase.from("students").update(changes).eq("id", id).eq("school_code", student.school_code).select().single();
    if (error) throw error;
    const updated = data || { ...student, ...changes };
    cacheStudent(updated);
    return updated;
  };
  const openEdit = field => { setEdit(field); setValue(String(student[field.key] ?? "")); };
  const save = async () => {
    const clean = value.trim();
    if (!clean) return alert("Value cannot be empty");
    if (edit.key === "number" && !/^\d{10}$/.test(clean)) return alert("Contact number must contain exactly 10 digits");
    if (edit.key === "pin" && !/^\d{4}$/.test(clean)) return alert("Student PIN must contain exactly 4 digits");
    if (edit.key === "section" && !/^[A-Za-z]$/.test(clean)) return alert("Enter a valid one-letter section");
    setSaving(true);
    try { await patchStudent({ [edit.key]: clean }); setEdit(null); }
    catch (error) { alert(error.message || "Profile update failed"); }
    finally { setSaving(false); }
  };
  const changePhoto = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    setSaving(true);
    try { const photo_url = await uploadMedia(file); await patchStudent({ photo_url }); setPhotoMenu(false); }
    catch (error) { alert(error.message || "Photo update failed"); }
    finally { setSaving(false); event.target.value = ""; }
  };
  const removePhoto = async () => {
    if (!student.photo_url || !confirm("Remove this profile photo?")) return;
    setSaving(true);
    try { await patchStudent({ photo_url: "" }); setPhotoMenu(false); }
    catch (error) { alert(error.message || "Photo could not be removed"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="workspace-loading"><span></span><b>Loading student profile…</b></div>;
  if (!student) return <div className="workspace-error">Student record not found.</div>;
  const role = localStorage.getItem("activeSchoolSession");
  const activeAdmin = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");
  const activeStudent = JSON.parse(localStorage.getItem("studentData") || "{}");
  if (role === "admin" && activeAdmin.school_code && activeAdmin.school_code !== student.school_code) return <div className="workspace-error">This student does not belong to your school.</div>;
  if (role === "student" && activeStudent.id && activeStudent.id !== id) return <div className="workspace-error">You cannot open another student's profile.</div>;

  return <main className="profile-page-shell">
    <section className="profile-premium-card">
      <button className="profile-close" onClick={() => navigate(-1)} aria-label="Close profile"><X /></button>
      <header className="profile-school"><img src={school.school_logo || student.school_logo || "/brand-mark.svg"} alt="School logo"/><div><small>REGISTERED SCHOOL · CODE {student.school_code}</small><h2>{school.school_name || student.school_name}</h2></div><School /></header>
      <div className="profile-identity">
        <button className="profile-avatar-button" onClick={() => setPhotoMenu(true)} aria-label="Profile photo options">{student.photo_url ? <img src={student.photo_url} alt={student.name}/> : <span className="profile-avatar-initials">{initials(student.name)}</span>}</button>
        <div><small>STUDENT PROFILE</small><h1>{student.name}</h1><p>Class {student.class}-{student.section} · Roll {student.roll}</p></div>
      </div>
      <div className="profile-details-grid">{fields.map(field => { const Icon = field.icon; return <article key={field.key}><span><Icon/></span><div><small>{field.label}</small><b title={student[field.key]}>{field.key === "pin" ? student.pin || "—" : student[field.key] || "—"}</b></div><button onClick={() => openEdit(field)} aria-label={`Edit ${field.label}`}><Edit3/></button></article>; })}</div>
    </section>
    <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={changePhoto}/>
    {photoMenu && <div className="media-action-sheet" onMouseDown={() => setPhotoMenu(false)}><section className="media-action-card" onMouseDown={event => event.stopPropagation()}><small>PROFILE PHOTO</small><h2>Choose an action</h2><div className="media-action-list"><button disabled={!student.photo_url} onClick={() => { setPhotoMenu(false); setPhotoViewer(true); }}><Eye/> View photo</button><button disabled={saving} onClick={() => fileRef.current?.click()}><ImagePlus/> {student.photo_url ? "Change photo" : "Add photo"}</button><button className="danger" disabled={!student.photo_url || saving} onClick={removePhoto}><Trash2/> Remove photo</button><button onClick={() => setPhotoMenu(false)}><X/> Cancel</button></div></section></div>}
    {photoViewer && student.photo_url && <div className="image-lightbox" onMouseDown={() => setPhotoViewer(false)}><img src={student.photo_url} alt={student.name} onMouseDown={event => event.stopPropagation()}/><button onClick={() => setPhotoViewer(false)} aria-label="Close image"><X/></button></div>}
    {edit && <div className="functional-modal" onMouseDown={() => setEdit(null)}><div onMouseDown={event => event.stopPropagation()}><small>EDIT PROFILE</small><h2>{edit.label}</h2>{edit.key === "class" ? <select value={value} onChange={event => setValue(event.target.value)}><option>Nursery</option><option>LKG</option><option>UKG</option>{[...Array(10)].map((_, index) => <option key={index}>{index + 1}</option>)}</select> : edit.key === "section" ? <select value={value.toUpperCase()} onChange={event => setValue(event.target.value)}><option>A</option><option>B</option><option>C</option></select> : <input autoFocus type={edit.key === "pin" ? "password" : edit.key === "number" ? "tel" : "text"} inputMode={edit.key === "pin" || edit.key === "number" ? "numeric" : undefined} maxLength={edit.key === "pin" ? 4 : edit.key === "number" ? 10 : 120} value={value} onChange={event => setValue(edit.key === "pin" || edit.key === "number" ? event.target.value.replace(/\D/g, "") : event.target.value)} onKeyDown={event => event.key === "Enter" && save()}/>}<div><button onClick={() => setEdit(null)}>Cancel</button><button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button></div></div></div>}
  </main>;
}
