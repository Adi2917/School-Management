import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { CalendarCheck, CircleDollarSign, Clock3, ReceiptIndianRupee } from "lucide-react";
import "./AdminStudentFees.css";

const months = ["March","April","May","June","July","August","September","October","November","December","January","February"];
const placeholders = id => months.map(month => ({ id: `placeholder-${month}`, student_id:id, month, status:"Pending", paid_date:null, placeholder:true }));

export default function AdminStudentFees() {
  const { id } = useParams();
  const [fees, setFees] = useState(() => placeholders(id));
  const [student, setStudent] = useState(JSON.parse(localStorage.getItem("selectedStudent") || "null"));
  const [school, setSchool] = useState({});
  const [syncing, setSyncing] = useState(true);
  const adminSchool = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");

  const sortedFees = data => months.map(month => data.find(fee => fee.month === month) || placeholders(id).find(fee => fee.month === month));
  const load = async () => {
    setSyncing(true);
    const studentPromise = student?.id === id && (!adminSchool.school_code || student.school_code === adminSchool.school_code) ? Promise.resolve({ data: student }) : supabase.from("students").select("*").eq("id", id).eq("school_code", adminSchool.school_code).single();
    const [{ data: studentData }, { data: existing }] = await Promise.all([studentPromise, supabase.from("fees").select("*").eq("student_id", id)]);
    if (studentData) { setStudent(studentData); const { data: schoolData } = await supabase.from("schools").select("*").eq("school_code", studentData.school_code).single(); setSchool(schoolData || {}); }
    let records = existing || [];
    if (!records.length) { const { data } = await supabase.from("fees").insert(months.map(month => ({ student_id:id, school_code:studentData?.school_code, month, status:"Pending", paid_date:null }))); records = data || []; }
    setFees(sortedFees(records)); setSyncing(false);
  };
  useEffect(() => { load(); }, [id]);

  const updateStatus = async (fee, status) => {
    if (fee.placeholder) return;
    const paid_date = status === "Paid" ? new Date().toISOString() : null;
    setFees(current => current.map(item => item.id === fee.id ? { ...item, status, paid_date, updating:true } : item));
    const { error } = await supabase.from("fees").update({ status, paid_date }).eq("id", fee.id).eq("student_id", id);
    if (error) { alert("Fee update failed"); return load(); }
    setFees(current => current.map(item => item.id === fee.id ? { ...item, updating:false } : item));
  };
  const paid = useMemo(() => fees.filter(fee => !fee.placeholder && fee.status === "Paid").length, [fees]);
  const unauthorized = student && adminSchool.school_code && student.school_code !== adminSchool.school_code;
  if (unauthorized) return <div className="workspace-error">This student does not belong to your school.</div>;

  return <main className="fees-page-shell"><header className="finance-brand"><img src={school.school_logo || student?.school_logo || "/brand-mark.svg"} alt=""/><div><small>FINANCE DESK · SCHOOL CODE {student?.school_code || "—"}</small><h1>{school.school_name || student?.school_name || "School fees"}</h1><p>{student?.name || "Student"} · Class {student?.class || "—"}-{student?.section || "—"} · Roll {student?.roll || "—"}</p></div><ReceiptIndianRupee/></header>
    <section className="fees-premium-card"><div className="fees-title"><div><small>ACADEMIC SESSION</small><h2>Monthly fee ledger</h2></div>{syncing && <span className="sync-badge">Syncing…</span>}</div><div className="fees-summary premium-fee-summary"><div><CalendarCheck/><span><b>{paid}</b><small>Paid months</small></span></div><div><Clock3/><span><b>{12-paid}</b><small>Pending months</small></span></div><div><CircleDollarSign/><span><b>12</b><small>Academic cycle</small></span></div></div>
      <div className="premium-fee-grid">{fees.map(fee => <article key={fee.id} className={`${fee.status === "Paid" ? "is-paid" : "is-pending"} ${fee.placeholder ? "is-loading" : ""}`}><div className="fee-month"><small>MONTH</small><b>{fee.month}</b></div><div className="fee-state"><span></span><select disabled={fee.placeholder || fee.updating} value={fee.status} onChange={e => updateStatus(fee,e.target.value)}><option>Pending</option><option>Paid</option></select></div><div className="fee-date"><small>PAYMENT DATE</small><b>{fee.paid_date ? new Date(fee.paid_date).toLocaleDateString() : "Not paid"}</b></div></article>)}</div>
    </section></main>;
}
