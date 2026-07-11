import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AdminStudentClass.css";

export default function AdminStudentClass() {
  const { className } = useParams();
  const navigate = useNavigate();

  const [schoolCode, setSchoolCode] = useState("");
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");

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

        {/* Heading */}
        <h2 className="class-heading">
          Class {className}
        </h2>

        {/* Section Filter */}
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

        <hr className="divider" />

        {/* Search */}
        <input
          type="text"
          placeholder="Search Student..."
          className="class-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Student Grid */}
        <div className="student-grid">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="student-cell"
              onClick={() =>
                navigate(`/AdminStudentDashboard/${student.id}`)
              }
            >
              {student.name}
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
