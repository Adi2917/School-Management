import React from "react";
import { useNavigate } from "react-router-dom";
import { FaBuilding, FaGraduationCap, FaArrowRight } from "react-icons/fa";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">
      <div className="home-shell">
        <div className="home-content">
          <span className="home-badge">Education Platform</span>

          <h1 className="home-title">Register Your School • Join Your School</h1>

          <p className="home-subtitle">
            One clean school-first experience for school registration, student joining,
            and secure admin access.
          </p>

          <div className="home-cards">
            <div className="feature-card feature-primary">
              <div className="feature-icon">
                <FaBuilding size={24} />
              </div>
              <h2>Register Your School</h2>
              <p>
                Add your school profile, set a 6-digit school code, and create the admin credentials.
              </p>
              <button onClick={() => navigate("/SchoolRegister")}>
                Register Your School <FaArrowRight />
              </button>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaGraduationCap size={24} />
              </div>
              <h2>Join Your School</h2>
              <p>
                Students and admins can join using their school code and secure personal pin.
              </p>
              <button onClick={() => navigate("/StudentChoice")}>
                Join Your School <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
