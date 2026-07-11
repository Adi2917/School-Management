import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Forget Password State
  const [showReset, setShowReset] = useState(false);
  const [adminNumber, setAdminNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    // Check if already logged in
    const storedData = localStorage.getItem("adminData");
    if (storedData) {
      navigate("/AdminDashboard");
    }
  }, [navigate]);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Invalid email or password");
      setLoading(false);
    } else {
      localStorage.setItem("adminData", JSON.stringify(data.user));
      setLoading(false);
      navigate("/AdminDashboard");
    }
  };

  // Password Reset
  const handleReset = async () => {
    if (adminNumber !== "0987654321") {
      setResetMsg("Invalid Admin Number!");
      return;
    }

    try {
      // Update Supabase password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setResetMsg("Error updating password");
      } else {
        setResetMsg("Password updated successfully!");
        setShowReset(false);
        setPassword(newPassword);
      }
    } catch (err) {
      setResetMsg("Something went wrong!");
    }
  };

  return (
    <div className="admin-login-container">
      <div className="login-card">
        <h2>Admin Login</h2>
        <p>Enter your credentials to access the dashboard</p>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errorMsg && <p className="error-msg">{errorMsg}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="forget-password" onClick={() => setShowReset(true)}>
          Forgot Password?
        </p>
      </div>

      {/* Reset Password Popup */}
      {showReset && (
        <div className="reset-popup">
          <div className="reset-card">
            <h3>Reset Admin Password</h3>
            <input
              type="text"
              placeholder="Enter Admin Number"
              value={adminNumber}
              onChange={(e) => setAdminNumber(e.target.value)}
            />
            <input
              type="password"
              placeholder="Enter New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button onClick={handleReset}>Save</button>
            <button className="close-btn" onClick={() => setShowReset(false)}>
              ✕
            </button>
            {resetMsg && <p className="reset-msg">{resetMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
