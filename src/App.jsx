import { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import "./premium-alert.css";
import { clearExpiredSession, getSessionDestination, getSessionExpiresAt } from "./session";

import Home from "./Pages/Home";
import StudentChoice from "./Pages/StudentChoice";
import StudentRegister from "./Pages/StudentRegister";
import StudentLogin from "./Pages/StudentLogin";
import SchoolRegister from "./Pages/SchoolRegister";
import SchoolLogin from "./Pages/SchoolLogin";
import StudentDashboard from "./Pages/StudentDashboard";
import StudentProfile from "./Pages/StudentProfile";
import AdminDashboard from "./Pages/AdminDashboard";
import AdminStudentDashboard from "./Pages/AdminStudentDashboard";
import AdminStudentClass from "./Pages/AdminStudentClass";
import StudentFees from "./Pages/StudentFees";
import AdminStudentFees from "./Pages/AdminStudentFees";
import StudentNotification from "./Pages/StudentNotification";
import AdminStudentNotification from "./Pages/AdminStudentNotification";
import AdminStudentResult from "./Pages/AdminStudentResult";
import StudentResult from "./Pages/StudentResult";
import PrivacyPolicy from "./Pages/PrivacyPolicy";

import MainLayout from "./Layout/MainLayout";
import ScrollToTop from "./Components/ScrollToTop";

function PremiumAlert(){const[message,setMessage]=useState("");useEffect(()=>{const nativeAlert=window.alert;window.alert=value=>setMessage(String(value||"Please check the entered details."));return()=>{window.alert=nativeAlert}},[]);if(!message)return null;return <div className="premium-alert-backdrop" role="dialog" aria-modal="true" onMouseDown={()=>setMessage("")}><section className="premium-alert" onMouseDown={event=>event.stopPropagation()}><span>CONNECT YOUR SCHOOL</span><h2>Quick update</h2><p>{message}</p><button onClick={()=>setMessage("")}>Got it</button></section></div>}

const publicEntryPaths = new Set(["/", "/Home", "/StudentChoice", "/StudentRegister", "/StudentLogin", "/SchoolRegister", "/SchoolLogin", "/AdminLogin"]);

function SessionController() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const destination = getSessionDestination();
    if (destination && publicEntryPaths.has(location.pathname)) {
      navigate(destination, { replace: true });
    }

    const expiresAt = getSessionExpiresAt();
    if (!expiresAt) return undefined;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearExpiredSession();
      navigate("/Home", { replace: true });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      clearExpiredSession();
      navigate("/Home", { replace: true });
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [location.pathname, navigate]);

  return null;
}

function App() {
  return (
    <><ScrollToTop/><SessionController/><PremiumAlert/><Routes>
      {/* Home page – NO header */}
      <Route path="/" element={<Home />} />
      <Route path="/Home" element={<Home />} />
      <Route path="/SchoolRegister" element={<SchoolRegister />} />
      <Route path="/SchoolLogin" element={<SchoolLogin />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* Pages WITH Layout */}
      <Route element={<MainLayout />}>

        <Route path="/StudentChoice" element={<StudentChoice />} />
        <Route path="/StudentRegister" element={<StudentRegister />} />
        <Route path="/StudentLogin" element={<StudentLogin />} />
        <Route path="/StudentDashboard" element={<StudentDashboard />} />

        <Route path="/StudentProfile/:id" element={<StudentProfile />} />

        <Route path="/AdminLogin" element={<SchoolLogin />} />
        <Route path="/AdminDashboard" element={<AdminDashboard />} />

        <Route path="/AdminStudentClass/:className" element={<AdminStudentClass />} />
        <Route path="/AdminStudentDashboard/:id" element={<AdminStudentDashboard />} />
        <Route path="/AdminStudentFees/:id" element={<AdminStudentFees />} />
        <Route path="/StudentFees/:id" element={<StudentFees />} />

        {/* RESULT ROUTES */}
        <Route
          path="/AdminStudentResult/:studentId"
          element={<AdminStudentResult />}
        />

        <Route
          path="/studentresult/:studentId"
          element={<StudentResult />}
        />

        {/* Notifications */}
        <Route
          path="/StudentNotification/:id"
          element={<StudentNotification />}
        />

        <Route
          path="/AdminStudentNotification"
          element={<AdminStudentNotification />}
        />

      </Route>
    </Routes></>
  );
}

export default App;

// import { Routes, Route } from "react-router-dom";

// import Home from "./Pages/Home";
// import StudentChoice from "./Pages/StudentChoice";
// import StudentRegister from "./Pages/StudentRegister";
// import StudentLogin from "./Pages/StudentLogin";
// import StudentDashboard from "./Pages/StudentDashboard";
// import StudentProfile from "./Pages/StudentProfile";
// import AdminLogin from "./Pages/AdminLogin";
// import AdminDashboard from "./Pages/AdminDashboard";
// import AdminStudentDashboard from "./Pages/AdminStudentDashboard";
// import AdminStudentClass from "./Pages/AdminStudentClass";
// import StudentFees from "./Pages/StudentFees";
// import AdminStudentFees from "./Pages/AdminStudentFees";
// import StudentNotification from "./Pages/StudentNotification";
// import AdminStudentNotification from "./Pages/AdminStudentNotification";
// import AdminStudentResult from "./Pages/AdminStudentResult";
// import StudentResult from "./Pages/StudentResult";

// import MainLayout from "./Layout/MainLayout";

// function App() {
//   return (
//     <Routes>
//       {/* Home page – NO header */}
//       <Route path="/" element={<Home />} />
//       <Route path="/Home" element={<Home />} />

//       {/* Pages WITH Layout */}
//       <Route element={<MainLayout />}>

//         <Route path="/StudentChoice" element={<StudentChoice />} />
//         <Route path="/StudentRegister" element={<StudentRegister />} />
//         <Route path="/StudentLogin" element={<StudentLogin />} />
//         <Route path="/StudentDashboard" element={<StudentDashboard />} />

//         <Route path="/StudentProfile/:id" element={<StudentProfile />} />

//         <Route path="/AdminLogin" element={<AdminLogin />} />
//         <Route path="/AdminDashboard" element={<AdminDashboard />} />

//         <Route path="/AdminStudentClass/:className" element={<AdminStudentClass />} />
//         <Route path="/AdminStudentDashboard/:id" element={<AdminStudentDashboard />} />
//         <Route path="/AdminStudentFees/:id" element={<AdminStudentFees />} />
//         <Route path="/StudentFees/:id" element={<StudentFees />} />

//         {/* 🔥 RESULT ROUTES ADDED */}
//         <Route
//           path="/AdminStudentResult/:studentId"
//           element={<AdminStudentResult />}
//         />

//         <Route
//           path="/studentresult/:studentId"
//           element={<StudentResult />}
//         />

//         {/* 🔔 Notifications */}
//         <Route
//           path="/StudentNotification/:id"
//           element={<StudentNotification />}
//         />

//         <Route
//           path="/AdminStudentNotification"
//           element={<AdminStudentNotification />}
//         />

//       </Route>
//     </Routes>
//   );
// }

// export default App;
