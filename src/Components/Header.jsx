import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const schoolData = JSON.parse(localStorage.getItem("schoolData") || "{}");

  return (
    <div className="app-header">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={22} />
      </button>

      <span className="header-title">{schoolData.school_name || "School Portal"}</span>

      <div className="header-right" />
    </div>
  );
}
