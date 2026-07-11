import "./StudentChoice.css";
import { useNavigate } from "react-router-dom";

export default function StudentChoice() {
  const navigate = useNavigate();

  const handleStudentLogin = () => {
    const studentData = localStorage.getItem("studentData");
    if (studentData) {
      navigate("/StudentDashboard");
    } else {
      navigate("/StudentLogin");
    }
  };

  const handleAdminLogin = () => {
    const schoolData = localStorage.getItem("schoolData");
    if (schoolData) {
      navigate("/AdminDashboard");
    } else {
      navigate("/SchoolLogin");
    }
  };

  return (
    <div className="choice-container">
      <div className="choice-card">
        <div className="choice-pill">Join Your School</div>

        <h1 className="choice-title">Choose your access</h1>

        <p className="choice-desc">
          Students can register or log in with their school code and pin,
          while admins can securely enter the school dashboard.
        </p>

        <div className="choice-buttons">
          <button className="btn-primary" onClick={() => navigate("/StudentRegister")}>
            Register as Student
          </button>

          <button className="btn-outline" onClick={handleStudentLogin}>
            Login as Student
          </button>

          <button className="btn-outline admin-btn" onClick={handleAdminLogin}>
            Admin Login
          </button>
        </div>

        <div className="choice-divider"></div>

        <p className="choice-footer">
          Secure school-first access for every connected device.
        </p>
      </div>
    </div>
  );
}
