import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminStudentClass.css";
import { ArrowRight, BookOpen, GraduationCap, Search, UserRound, Users } from "lucide-react";

export default function AdminStudentClass() {
  const { className } = useParams();
  const navigate = useNavigate();

  const [schoolCode, setSchoolCode] = useState("");
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");
  const openStudent = (student) => { localStorage.setItem("selectedStudent", JSON.stringify(student)); navigate(`/AdminStudentDashboard/${student.id}`); };

  useEffect(() => {
    const schoolData = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");
    setSchoolCode(schoolData?.school_code || "");
    fetchStudents(schoolData?.school_code || "");
  }, [className]);

  const fetchStudents = async (activeSchoolCode) => {
    const localRegistry = JSON.parse(localStorage.getItem("studentRegistry") || "[]");
    const localData = localRegistry.filter(
      (student) =>
        student.school_code === activeSchoolCode && student.class === className
    );

    if (localData.length > 0) {
      setStudents(localData);
      setFilteredStudents(localData);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("school_code", activeSchoolCode)
        .eq("class", className);

      if (!error) {
        setStudents(data || []);
        setFilteredStudents(data || []);
      }
    } catch {
      setStudents([]);
      setFilteredStudents([]);
    }
  };

  // 🔥 Section + Search Filter
  useEffect(() => {
    let temp = students;

    if (section !== "") {
      temp = temp.filter((s) => s.section === section);
    }

    if (search.trim() !== "") {
      temp = temp.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredStudents(temp);
  }, [section, search, students]);

  return (
    <div className="class-wrapper">

      <div className="class-card">
        <div className="class-hero"><div className="class-hero__icon"><BookOpen/></div><div><span>ACADEMIC DIRECTORY</span><h2 className="class-heading">Class {className}</h2><p>Manage sections and open individual student records.</p></div><div className="class-count"><Users/><span><b>{students.length}</b><small>Students</small></span></div></div>

        <div className="class-toolbar"><div><small>FILTER BY SECTION</small>
        <div className="section-filter">
          {["A", "B", "C"].map((sec) => (
            <button
              key={sec}
              className={section === sec ? "active" : ""}
              onClick={() =>
                setSection(section === sec ? "" : sec)
              }
            >
              {sec}
            </button>
          ))}
        </div>
        </div><label className="class-search-wrap"><Search/><input
          type="text"
          placeholder="Search Student..."
          className="class-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        /></label></div>

        {/* Student Grid */}
        <div className="student-grid">
          {filteredStudents.map((student) => (
            <button
              key={student.id}
              className="student-cell"
              onClick={() => openStudent(student)}
            >
              <img src={student.photo_url || "/brand-mark.svg"} alt=""/><span><small>ROLL {student.roll}</small><b>{student.name}</b><em>Section {student.section}</em></span><ArrowRight/>
            </button>
          ))}
          {filteredStudents.length === 0 && <div className="class-empty"><UserRound/><h3>No students found</h3><p>Try another section or search term.</p></div>}
        </div>
        <div className="class-footer-note"><GraduationCap/> Showing records connected to this school only</div>
      </div>

    </div>
  );
}
