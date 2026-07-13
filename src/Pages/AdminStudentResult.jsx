import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { BookOpenCheck, ChevronDown, FilePenLine, Plus, Trash2 } from "lucide-react";
import "./AdminStudentResult.css";

const defaultSubjects = ["Maths", "Hindi", "English", "Science", "SSt", "Computer", "GK"];

export default function AdminStudentResult() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const adminSchool = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");
  const [student, setStudent] = useState(null);
  const [school, setSchool] = useState({});
  const [examTypes, setExamTypes] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [subjects, setSubjects] = useState(defaultSubjects);
  const [marks, setMarks] = useState({});
  const [maxMarks, setMaxMarks] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadWorkspace = async () => {
    setLoading(true);
    const { data: studentData } = await supabase.from("students").select("*").eq("id", studentId).single();
    if (!studentData) { setStudent(null); setLoading(false); return; }
    setStudent(studentData);
    const code = studentData.school_code;
    const [{ data: schoolData }, { data: exams }, { data: results }] = await Promise.all([
      supabase.from("schools").select("*").eq("school_code", code).single(),
      supabase.from("exam_types").select("*").eq("school_code", code).order("created_at"),
      supabase.from("results").select("*").eq("student_id", studentId).eq("school_code", code),
    ]);
    setSchool(schoolData || {}); setExamTypes(exams || []); setAllResults(results || []); setLoading(false);
  };
  useEffect(() => { loadWorkspace(); }, [studentId]);

  const resultGroups = useMemo(() => examTypes.map(exam => ({ exam, rows: allResults.filter(row => row.exam_type_id === exam.id) })).filter(group => group.rows.length), [examTypes, allResults]);
  const selectedName = examTypes.find(exam => exam.id === selectedExam)?.name || "Select examination";
  const resultExists = allResults.some(row => row.exam_type_id === selectedExam);

  const selectExam = exam => {
    const rows = allResults.filter(row => row.exam_type_id === exam.id);
    const obtained = {}, full = {};
    rows.forEach(row => { obtained[row.subject] = row.marks; full[row.subject] = row.max_marks || 100; });
    setSelectedExam(exam.id); setMarks(obtained); setMaxMarks(full);
    setSubjects(rows.length ? [...new Set([...defaultSubjects, ...rows.map(row => row.subject)])] : defaultSubjects);
    setMenuOpen(false);
  };

  const saveResult = async () => {
    if (!selectedExam) return alert("Select an examination first");
    if (subjects.some(subject => Number(marks[subject] ?? 0) > Number(maxMarks[subject] || 100))) return alert("Obtained marks cannot exceed full marks");
    setSaving(true);
    const rows = subjects.map(subject => ({ student_id: studentId, exam_type_id: selectedExam, subject, marks: Number(marks[subject] ?? 0), max_marks: Number(maxMarks[subject] || 100), school_code: student.school_code }));
    const { error: deleteError } = await supabase.from("results").delete().eq("student_id", studentId).eq("exam_type_id", selectedExam).eq("school_code", student.school_code);
    const { error } = deleteError ? { error: deleteError } : await supabase.from("results").insert(rows);
    setSaving(false);
    if (error) return alert(error.message || "Result could not be saved");
    await loadWorkspace(); alert(resultExists ? "Result updated" : "Result saved");
  };

  const addExam = async () => {
    const name = entry.trim(); if (!name) return;
    if (examTypes.some(exam => exam.name.toLowerCase() === name.toLowerCase())) return alert("This exam already exists");
    setSaving(true); const { data, error } = await supabase.from("exam_types").insert([{ name, school_code: student.school_code, created_at: new Date().toISOString() }]); setSaving(false);
    if (error) return alert(error.message || "Exam could not be added");
    const created = data?.[0]; setEntry(""); setModal(null); await loadWorkspace(); if (created) selectExam(created);
  };
  const addSubject = () => { const name = entry.trim(); if (!name) return; if (!subjects.includes(name)) setSubjects(current => [...current, name]); setEntry(""); setModal(null); };
  const deleteExam = async exam => { if (!confirm(`Delete “${exam.name}” and every result saved under it for this school?`)) return; await supabase.from("results").delete().eq("exam_type_id", exam.id).eq("school_code", student.school_code); await supabase.from("exam_types").delete().eq("id", exam.id).eq("school_code", student.school_code); if (selectedExam === exam.id) { setSelectedExam(""); setMarks({}); setMaxMarks({}); } await loadWorkspace(); };
  const deleteResult = async examId => { if (!confirm("Delete this saved result permanently?")) return; await supabase.from("results").delete().eq("student_id", studentId).eq("exam_type_id", examId).eq("school_code", student.school_code); if (selectedExam === examId) { setMarks({}); setMaxMarks({}); } await loadWorkspace(); };

  if (loading) return <div className="workspace-loading"><span></span><b>Opening result workspace…</b></div>;
  if (!student) return <div className="workspace-error">Student record not found.</div>;
  if (adminSchool.school_code && adminSchool.school_code !== student.school_code) return <div className="workspace-error">This student does not belong to your school.</div>;

  return <main className="admin-result-shell">
    <header className="result-workspace-hero"><img src={school.school_logo || student.school_logo || "/brand-mark.svg"} alt=""/><div><small>RESULT MANAGEMENT · SCHOOL CODE {student.school_code}</small><h1>{school.school_name || student.school_name}</h1><p>{student.name} · Class {student.class}-{student.section} · Roll {student.roll}</p></div></header>
    <div className="result-workspace-grid">
      <section className="result-editor-panel"><div className="panel-heading"><div><small>MARKS ENTRY</small><h2>Create or update result</h2></div><FilePenLine/></div>
        <div className="exam-picker"><button className="exam-picker__trigger" onClick={() => setMenuOpen(!menuOpen)}><span>{selectedName}</span><ChevronDown/></button>{menuOpen && <div className="exam-picker__menu">{!examTypes.length && <p>No exams added yet.</p>}{examTypes.map(exam => <div key={exam.id}><button onClick={() => selectExam(exam)}><BookOpenCheck/>{exam.name}</button><button className="picker-delete" onClick={() => deleteExam(exam)} title="Delete exam"><Trash2/></button></div>)}</div>}</div>
        <div className="result-toolbar"><button onClick={() => { setEntry(""); setModal("exam"); }}><Plus/> Add exam type</button><button onClick={() => { setEntry(""); setModal("subject"); }}><Plus/> Add subject</button></div>
        {selectedExam ? <div className="premium-marks-table"><div className="premium-marks-head"><span>Subject</span><span>Obtained</span><span>Full marks</span><span></span></div>{subjects.map(subject => <div className="premium-marks-row" key={subject}><b>{subject}</b><input type="number" min="0" value={marks[subject] ?? ""} onChange={e => setMarks({ ...marks, [subject]: e.target.value })}/><input type="number" min="1" value={maxMarks[subject] ?? 100} onChange={e => setMaxMarks({ ...maxMarks, [subject]: e.target.value })}/><button onClick={() => setSubjects(subjects.filter(item => item !== subject))}><Trash2/></button></div>)}</div> : <div className="editor-empty"><BookOpenCheck/><b>Select or add an examination</b><span>Marks entry will appear here.</span></div>}
        {selectedExam && <button className="result-save" disabled={saving} onClick={saveResult}>{saving ? "Saving result…" : resultExists ? "Update saved result" : "Save result"}</button>}
      </section>
      <aside className="saved-results-panel"><div className="panel-heading"><div><small>RESULT LIBRARY</small><h2>Saved results</h2></div><span>{resultGroups.length}</span></div>{!resultGroups.length && <div className="saved-empty">No result has been saved for this student.</div>}{resultGroups.map(({ exam, rows }) => { const total = rows.reduce((sum,row)=>sum+Number(row.marks||0),0); const max = rows.reduce((sum,row)=>sum+Number(row.max_marks||100),0); return <article key={exam.id} className="saved-result-card"><div><small>PUBLISHED EXAM</small><h3>{exam.name}</h3><p>{rows.length} subjects · {max ? (total/max*100).toFixed(1) : 0}%</p></div><div className="saved-result-actions"><button onClick={() => selectExam(exam)}>Edit</button><button onClick={() => navigate(`/StudentResult/${studentId}`)}>View</button><button onClick={() => deleteResult(exam.id)}><Trash2/></button></div></article>; })}</aside>
    </div>
    {modal && <div className="functional-modal" onMouseDown={() => setModal(null)}><div onMouseDown={e => e.stopPropagation()}><small>{modal === "exam" ? "NEW EXAM TYPE" : "NEW SUBJECT"}</small><h2>{modal === "exam" ? "Add examination" : "Add subject"}</h2><input autoFocus value={entry} onChange={e => setEntry(e.target.value)} placeholder={modal === "exam" ? "e.g. Half Yearly" : "e.g. Physics"} onKeyDown={e => e.key === "Enter" && (modal === "exam" ? addExam() : addSubject())}/><div><button onClick={() => setModal(null)}>Cancel</button><button disabled={saving} onClick={modal === "exam" ? addExam : addSubject}>{saving ? "Saving…" : "Add"}</button></div></div></div>}
  </main>;
}
