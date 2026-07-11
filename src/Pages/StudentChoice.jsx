import "./StudentChoice.css";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, GraduationCap, ShieldCheck, Sparkles, UserPlus } from "lucide-react";

export default function StudentChoice() {
  const navigate = useNavigate();
  const handleStudentLogin = () => navigate(localStorage.getItem("studentData") ? "/StudentDashboard" : "/StudentLogin");
  const handleAdminLogin = () => navigate(localStorage.getItem("schoolData") ? "/AdminDashboard" : "/SchoolLogin");

  return <div className="choice-container access-page">
    <div className="access-aside">
      <div className="access-brand"><span><BookOpen /></span>Connect <b>Your School</b></div>
      <div className="access-message"><span className="access-kicker"><Sparkles/> YOUR SCHOOL PORTAL</span><h1>One school.<br/>Every connection.</h1><p>A focused space for students, families and school teams to learn, manage and grow together.</p></div>
      <div className="access-points"><span><ShieldCheck/> Secure school access</span><span><GraduationCap/> Built around education</span></div>
      <div className="access-orbit"><GraduationCap/><i/><i/><i/></div>
    </div>
    <div className="choice-card access-card">
      <div className="choice-pill">WELCOME TO YOUR PORTAL</div>
      <h1 className="choice-title">How would you like to continue?</h1>
      <p className="choice-desc">Choose the space that belongs to you. Your school code keeps every account connected to the right community.</p>
      <div className="access-options">
        <button onClick={() => navigate("/StudentRegister")}><span className="option-icon"><UserPlus/></span><span><b>New student</b><small>Create your student profile</small></span><ArrowRight/></button>
        <button onClick={handleStudentLogin}><span className="option-icon"><GraduationCap/></span><span><b>Student login</b><small>Open your dashboard</small></span><ArrowRight/></button>
        <button className="admin-option" onClick={handleAdminLogin}><span className="option-icon"><Building2/></span><span><b>School administrator</b><small>Manage your school workspace</small></span><ArrowRight/></button>
      </div>
      <div className="choice-footer"><ShieldCheck/> Protected access for every connected device</div>
    </div>
  </div>;
}
