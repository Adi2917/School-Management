import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { CalendarCheck, CircleDollarSign, Clock3, ReceiptIndianRupee } from "lucide-react";
import "./AdminStudentFees.css";

const months = ["March","April","May","June","July","August","September","October","November","December","January","February"];
const placeholders = (id, student, school) => months.map(month => ({ id: `placeholder-${month}`, student_id:id, school_code:student?.school_code, fee_type:"monthly", month, amount:Number(school?.monthly_fees?.[student?.class]||0), due_amount:0, status:"Pending", placeholder:true }));

export default function AdminStudentFees() {
  const { id } = useParams();
  const [fees, setFees] = useState([]);
  const [student, setStudent] = useState(JSON.parse(localStorage.getItem("selectedStudent") || "null"));
  const [school, setSchool] = useState({});
  const [syncing, setSyncing] = useState(true);
  const adminSchool = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");

  const sortedFees = data => [...data.filter(fee => (fee.fee_type||"monthly") === "monthly").sort((a,b)=>months.indexOf(a.month)-months.indexOf(b.month)), ...data.filter(fee => fee.fee_type === "exam")];
  const load = async () => {
    setSyncing(true);
    const studentPromise = student?.id === id && (!adminSchool.school_code || student.school_code === adminSchool.school_code) ? Promise.resolve({ data: student }) : supabase.from("students").select("*").eq("id", id).eq("school_code", adminSchool.school_code).single();
    const [{ data: studentData }, { data: existing }] = await Promise.all([studentPromise, supabase.from("fees").select("*").eq("student_id", id)]);
    let schoolData={}; if (studentData) { setStudent(studentData); const response = await supabase.from("schools").select("*").eq("school_code", studentData.school_code).single(); schoolData=response.data||{}; setSchool(schoolData); }
    let records = existing || [];
    const monthly=placeholders(id,studentData,schoolData).filter(item=>!records.some(fee=>(fee.fee_type||"monthly")==="monthly"&&fee.month===item.month)).map(item=>({student_id:item.student_id,school_code:item.school_code,fee_type:item.fee_type,month:item.month,amount:item.amount,due_amount:item.due_amount,status:item.status}));
    const exams=(schoolData.exam_fees||[]).filter(item=>!records.some(fee=>fee.fee_type==="exam"&&fee.exam_fee_id===item.id)).map(item=>({student_id:id,school_code:studentData?.school_code,fee_type:"exam",exam_fee_id:item.id,title:`${item.name} · ${item.type}`,month:item.name,amount:Number(item.class_amounts?.[studentData?.class]||0),due_amount:0,status:"Pending"}));
    if(monthly.length||exams.length){const{data}=await supabase.from("fees").insert([...monthly,...exams]);records=data||records;}
    setFees(sortedFees(records)); setSyncing(false);
  };
  useEffect(() => { load(); }, [id]);

  const updateFee = async (fee, changes) => {
    if (fee.placeholder) return;
    const next={...changes,...(changes.status?{paid_at:changes.status==="Paid"?new Date().toISOString():""}:{})};
    setFees(current => current.map(item => item.id === fee.id ? { ...item, ...next, updating:true } : item));
    const { error } = await supabase.from("fees").update(next).eq("id", fee.id).eq("student_id", id);
    if (error) { alert("Fee update failed"); return load(); }
    setFees(current => current.map(item => item.id === fee.id ? { ...item, updating:false } : item));
  };
  const paid = useMemo(() => fees.filter(fee => !fee.placeholder && fee.status === "Paid").length, [fees]);
  const unauthorized = student && adminSchool.school_code && student.school_code !== adminSchool.school_code;
  if (unauthorized) return <div className="workspace-error">This student does not belong to your school.</div>;

  return <main className="fees-page-shell"><header className="finance-brand"><img src={school.school_logo || student?.school_logo || "/brand-mark.svg"} alt=""/><div><small>FINANCE DESK · SCHOOL CODE {student?.school_code || "—"}</small><h1>{school.school_name || student?.school_name || "School fees"}</h1><p>{student?.name || "Student"} · Class {student?.class || "—"}-{student?.section || "—"} · Roll {student?.roll || "—"}</p></div><ReceiptIndianRupee/></header>
    <section className="fees-premium-card"><div className="fees-title"><div><small>ACADEMIC SESSION</small><h2>Monthly fee ledger</h2></div>{syncing && <span className="sync-badge">Syncing…</span>}</div><div className="fees-summary premium-fee-summary"><div><CalendarCheck/><span><b>{paid}</b><small>Paid months</small></span></div><div><Clock3/><span><b>{12-paid}</b><small>Pending months</small></span></div><div><CircleDollarSign/><span><b>12</b><small>Academic cycle</small></span></div></div>
      <div className="premium-fee-grid">{fees.map(fee => <article key={fee.id} className={`${fee.status === "Paid" ? "is-paid" : "is-pending"}`}><div className="fee-month"><small>{fee.fee_type==="exam"?"EXAM FEE":"MONTH"}</small><b>{fee.title||fee.month}</b><strong>₹{Number(fee.amount||0).toLocaleString("en-IN")}</strong></div><div className="fee-state"><label>Dues ₹<input inputMode="numeric" value={fee.due_amount??0} onChange={e=>setFees(current=>current.map(item=>item.id===fee.id?{...item,due_amount:e.target.value.replace(/\D/g,"")}:item))} onBlur={()=>updateFee(fee,{due_amount:Number(fee.due_amount||0)})}/></label><select disabled={fee.updating} value={fee.status} onChange={e => updateFee(fee,{status:e.target.value,due_amount:Number(fee.due_amount||0)})}><option>Pending</option><option>Partial</option><option>Paid</option></select></div><div className="fee-date"><small>PAYMENT DATE</small><b>{fee.paid_at ? new Date(fee.paid_at).toLocaleDateString() : "Not paid"}</b></div></article>)}</div>
    </section></main>;
}
