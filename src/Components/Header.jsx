import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const role = localStorage.getItem("activeSchoolSession");
  const storedSchool = JSON.parse(localStorage.getItem("schoolData") || "{}");
  const storedStudent = JSON.parse(localStorage.getItem("studentData") || "{}");
  const active = role === "student" ? storedStudent : role === "admin" ? storedSchool : storedSchool.school_code ? storedSchool : storedStudent;
  const [school, setSchool] = useState({ school_name: active.school_name, school_logo: active.school_logo });
  const [logoOpen, setLogoOpen] = useState(false);
  const schoolCode = active.school_code;

  useEffect(() => {
    if (!schoolCode) return;
    let mounted = true;
    const refresh = async () => {
      const { data } = await supabase.from("schools").select("*").eq("school_code", schoolCode).single();
      if (!mounted || !data) return;
      setSchool(data);
      if (role === "admin") { localStorage.setItem("schoolData", JSON.stringify(data)); localStorage.setItem("adminData", JSON.stringify(data)); }
      if (role === "student") {
        const current = JSON.parse(localStorage.getItem("studentData") || "{}");
        localStorage.setItem("studentData", JSON.stringify({ ...current, school_name: data.school_name, school_logo: data.school_logo }));
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { mounted = false; window.removeEventListener("focus", refresh); };
  }, [role, schoolCode]);

  const logo = school.school_logo || active.school_logo;
  return <>
    <div className="app-header">
      <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={22}/></button>
      <div className="header-brand"><button className="header-logo-button" onClick={() => logo && setLogoOpen(true)} aria-label="View school logo">{logo ? <img src={logo} alt="School logo"/> : <BookOpen size={18}/>}</button><div><small>CONNECT YOUR SCHOOL</small><b>{school.school_name || active.school_name || "School Portal"}</b></div></div>
      <div className="header-right"/>
    </div>
    {logoOpen && logo && <div className="image-lightbox" onMouseDown={() => setLogoOpen(false)}><img src={logo} alt="School logo" onMouseDown={event => event.stopPropagation()}/><button onClick={() => setLogoOpen(false)} aria-label="Close logo"><X/></button></div>}
  </>;
}
