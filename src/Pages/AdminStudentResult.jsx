import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FaTrash } from "react-icons/fa";
import "./AdminStudentResult.css";

const defaultSubjects = ["Maths", "Hindi", "English", "Science", "SSt", "Computer", "GK"];

export default function AdminStudentResult() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [subjects, setSubjects] = useState(defaultSubjects);
  const [marks, setMarks] = useState({});
  const [maxMarks, setMaxMarks] = useState({});
  const [school, setSchool] = useState({});
  const [student, setStudent] = useState({});
  const [resultExists, setResultExists] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [newExam, setNewExam] = useState("");
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  const fetchExamTypes = async (schoolCode) => { const { data } = await supabase.from("exam_types").select("*").order("created_at"); setExamTypes((data || []).filter(exam => !exam.school_code || exam.school_code === schoolCode)); };
  useEffect(() => { supabase.from("students").select("*").eq("id", studentId).single().then(async ({ data }) => { if (!data) return; setStudent(data); fetchExamTypes(data.school_code); const { data: schoolData } = await supabase.from("schools").select("*").eq("school_code", data.school_code).single(); setSchool(schoolData || { school_name: data.school_name, school_logo: data.school_logo }); }); }, [studentId]);
  useEffect(() => { if (!selectedExam) return; supabase.from("results").select("*").eq("student_id", studentId).eq("exam_type_id", selectedExam).then(({ data }) => { const obtained = {}, full = {}; (data || []).forEach(i => { obtained[i.subject] = i.marks; full[i.subject] = i.max_marks || 100; }); setMarks(obtained); setMaxMarks(full); setResultExists(Boolean(data?.length)); }); }, [selectedExam, studentId]);

  const saveResult = async () => {
    if (!selectedExam) return alert("Select Exam");
    const invalid = subjects.some(sub => Number(marks[sub] || 0) > Number(maxMarks[sub] || 100));
    if (invalid) return alert("Obtained marks cannot be greater than full marks");
    const rows = subjects.map(subject => ({ student_id: studentId, exam_type_id: selectedExam, subject, marks: Number(marks[subject] || 0), max_marks: Number(maxMarks[subject] || 100), school_code: student.school_code }));
    await supabase.from("results").delete().eq("student_id", studentId).eq("exam_type_id", selectedExam);
    await supabase.from("results").insert(rows); setResultExists(true); alert("Result Saved");
  };
  const addExam = async () => { if (!newExam) return; await supabase.from("exam_types").insert([{ name: newExam, school_code: student.school_code }]); setNewExam(""); setShowExamModal(false); fetchExamTypes(student.school_code); };
  const addSubject = () => { if (!newSubject) return; setSubjects([...subjects, newSubject]); setNewSubject(""); setShowSubjectModal(false); };

  return <div className="admin-result-container">
    <div className="result-brand"><img src={school.school_logo || "/brand-mark.svg"} alt=""/><div><small>RESULT DESK</small><h2>{school.school_name || student.school_name || "School"}</h2><p>{student.name || "Student"} · Class {student.class || "—"}-{student.section || "—"} · Roll {student.roll || "—"}</p></div></div>
    <h3>Upload Result</h3>
    <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}><option value="">Select Exam</option>{examTypes.map(exam => <option key={exam.id} value={exam.id}>{exam.name}</option>)}</select>
    <div className="inline-buttons"><button onClick={() => setShowExamModal(true)}>Add Exam</button><button onClick={() => setShowSubjectModal(true)}>Add Subject</button></div>
    <div className="marks-table result-entry-table"><div className="table-header"><span>Subject</span><span>Obtained</span><span>Full Marks</span><span>Delete</span></div>{subjects.map(sub => <div key={sub} className="table-row"><span>{sub}</span><input type="number" min="0" value={marks[sub] ?? ""} onChange={e => setMarks({...marks,[sub]:e.target.value})}/><input type="number" min="1" value={maxMarks[sub] ?? 100} onChange={e => setMaxMarks({...maxMarks,[sub]:e.target.value})}/><FaTrash className="delete-icon" onClick={() => setSubjects(subjects.filter(s => s !== sub))}/></div>)}</div>
    <button className="save-btn" onClick={saveResult}>Save Result</button>{resultExists && <button className="view-result-btn" onClick={() => navigate(`/StudentResult/${studentId}`)}>View Result</button>}
    {showExamModal && <div className="modal-overlay"><div className="modal"><h3>Add Exam</h3><input value={newExam} onChange={e => setNewExam(e.target.value)} placeholder="Exam Name"/><div className="modal-buttons"><button onClick={addExam}>Save</button><button onClick={() => setShowExamModal(false)}>Cancel</button></div></div></div>}
    {showSubjectModal && <div className="modal-overlay"><div className="modal"><h3>Add Subject</h3><input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject Name"/><div className="modal-buttons"><button onClick={addSubject}>Add</button><button onClick={() => setShowSubjectModal(false)}>Cancel</button></div></div></div>}
  </div>;
}
