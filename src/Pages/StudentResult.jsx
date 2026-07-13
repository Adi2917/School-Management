import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Award, BookOpenCheck, Printer } from "lucide-react";
import "./StudentResult.css";

export default function StudentResult(){
  const { studentId }=useParams();
  const [student,setStudent]=useState({}),[school,setSchool]=useState({}),[exams,setExams]=useState([]),[allResults,setAllResults]=useState([]),[selected,setSelected]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{setLoading(true);const{data:studentData}=await supabase.from("students").select("*").eq("id",studentId).single();setStudent(studentData||{});if(!studentData){setLoading(false);return;}const[{data:schoolData},{data:examData},{data:resultData}]=await Promise.all([supabase.from("schools").select("*").eq("school_code",studentData.school_code).single(),supabase.from("exam_types").select("*").eq("school_code",studentData.school_code).order("created_at"),supabase.from("results").select("*").eq("student_id",studentId).eq("school_code",studentData.school_code)]);setSchool(schoolData||{});const published=(examData||[]).filter(exam=>(resultData||[]).some(row=>row.exam_type_id===exam.id));setExams(published);setAllResults(resultData||[]);setSelected(published[0]?.id||"");setLoading(false);})()},[studentId]);
  const rows=useMemo(()=>allResults.filter(row=>row.exam_type_id===selected),[allResults,selected]);const exam=exams.find(item=>item.id===selected);const total=rows.reduce((sum,row)=>sum+Number(row.marks||0),0);const maximum=rows.reduce((sum,row)=>sum+Number(row.max_marks||100),0);const percentage=maximum?total/maximum*100:0;
  if(loading)return <div className="workspace-loading"><span></span><b>Loading published results…</b></div>;
  return <main className="student-result-shell">
    <header className="result-student-hero"><img src={school.school_logo||student.school_logo||"/brand-mark.svg"} alt=""/><div><small>ACADEMIC RECORD · SCHOOL CODE {student.school_code||"—"}</small><h1>{school.school_name||student.school_name||"School"}</h1><p>{student.name||"Student"} · Class {student.class||"—"}-{student.section||"—"} · Roll {student.roll||"—"}</p></div><Award/></header>
    {!exams.length?<section className="no-published-result"><BookOpenCheck/><h2>Result not available</h2><p>Your school has not published a result yet.</p></section>:<div className="student-result-layout">
      <aside className="student-exam-list"><small>PUBLISHED RESULTS</small><h2>Examinations</h2>{exams.map(item=>{const examRows=allResults.filter(row=>row.exam_type_id===item.id);const score=examRows.reduce((sum,row)=>sum+Number(row.marks||0),0);const max=examRows.reduce((sum,row)=>sum+Number(row.max_marks||100),0);return <button className={selected===item.id?"active":""} key={item.id} onClick={()=>setSelected(item.id)}><span><BookOpenCheck/></span><div><b>{item.name}</b><small>{examRows.length} subjects · {max?(score/max*100).toFixed(1):0}%</small></div></button>})}</aside>
      <section className="published-marksheet" id="printable-result">
        <div className="print-school-header"><img src={school.school_logo||student.school_logo||"/brand-mark.svg"} alt="School logo"/><div><small>CONNECT YOUR SCHOOL · OFFICIAL ACADEMIC RECORD</small><h1>{school.school_name||student.school_name||"School"}</h1><p>{school.location||"Verified school result"}</p></div><span>CODE<br/><b>{student.school_code}</b></span></div>
        <div className="print-student-strip"><img src={student.photo_url||"/brand-mark.svg"} alt="Student"/><div><small>STUDENT NAME</small><b>{student.name}</b></div><div><small>CLASS & SECTION</small><b>{student.class}-{student.section}</b></div><div><small>ROLL NUMBER</small><b>{student.roll}</b></div><div><small>EXAMINATION</small><b>{exam?.name}</b></div></div>
        <div className="published-heading"><div><small>MARKS STATEMENT</small><h2>{exam?.name} Examination</h2><p>Academic performance report</p></div><Award/></div>
        <div className="published-table"><div><b>Subject</b><b>Obtained</b><b>Full marks</b></div>{rows.map(row=><div key={row.id}><span>{row.subject}</span><strong>{row.marks}</strong><span>{row.max_marks||100}</span></div>)}</div>
        <div className="published-summary"><article><small>TOTAL SCORE</small><b>{total} / {maximum}</b></article><article><small>PERCENTAGE</small><b>{percentage.toFixed(2)}%</b></article><article><small>STATUS</small><b>{percentage>=33?"PASS":"REVIEW"}</b></article></div>
        <div className="result-signatures"><span><b>Class Teacher</b><small>Signature</small></span><span><b>Principal</b><small>Signature & seal</small></span></div>
        <div className="result-issued">Generated on {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})} · This is a digitally generated school record.</div>
        <button className="print-result" onClick={()=>window.print()}><Printer/> Print result</button>
      </section>
    </div>}
  </main>;
}
