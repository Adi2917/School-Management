import { ArrowLeft, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const schoolData = JSON.parse(localStorage.getItem("schoolData") || "{}");
  const studentData = JSON.parse(localStorage.getItem("studentData") || "{}");
  const activeSchoolName = schoolData.school_name || studentData.school_name || "School Portal";

  return (
    <div className="app-header">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={22} />
      </button>

      <div className="header-brand"><span>{(schoolData.school_logo || studentData.school_logo) ? <img src={schoolData.school_logo || studentData.school_logo} alt=""/> : <BookOpen size={18}/>}</span><div><small>CONNECT YOUR SCHOOL</small><b>{activeSchoolName}</b></div></div>

      <div className="header-right" />
    </div>
  );
}
