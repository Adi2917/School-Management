import React,{useEffect,useState} from "react";
import {useParams,useNavigate} from "react-router-dom";
import {supabase} from "../supabaseClient";
import {FaTrash} from "react-icons/fa";
import "./AdminStudentResult.css";

const defaultSubjects=[
"Maths",
"Hindi",
"English",
"Science",
"SSt",
"Computer",
"GK"
];

export default function AdminStudentResult(){

const {studentId}=useParams();

const navigate=useNavigate();

const [examTypes,setExamTypes]=useState([]);

const [selectedExam,setSelectedExam]=useState("");

const [subjects,setSubjects]=useState(defaultSubjects);

const [marks,setMarks]=useState({});

const [resultExists,setResultExists]=useState(false);

const [showExamModal,setShowExamModal]=useState(false);

const [newExam,setNewExam]=useState("");

const [showSubjectModal,setShowSubjectModal]=useState(false);

const [newSubject,setNewSubject]=useState("");

useEffect(()=>{

fetchExamTypes();

},[]);

useEffect(()=>{

if(selectedExam){

loadMarks();

}

},[selectedExam]);

const fetchExamTypes=async()=>{

const {data}=await supabase
.from("exam_types")
.select("*")
.order("created_at");

setExamTypes(data||[]);

};

const loadMarks=async()=>{

const {data}=await supabase
.from("results")
.select("*")
.eq("student_id",studentId)
.eq("exam_type_id",selectedExam);

if(data.length>0){

let obj={};

data.forEach(i=>{

obj[i.subject]=i.marks;

});

setMarks(obj);

setResultExists(true);

}else{

setMarks({});

setResultExists(false);

}

};

const handleMarkChange=(sub,val)=>{

if(val>100)return;

setMarks({

...marks,

[sub]:val

});

};

const handleSave=async()=>{

if(!selectedExam){

alert("Select Exam");

return;

}

const insertData=subjects.map(sub=>({

student_id:studentId,

exam_type_id:selectedExam,

subject:sub,

marks:Number(marks[sub]||0)

}));

await supabase
.from("results")
.delete()
.eq("student_id",studentId)
.eq("exam_type_id",selectedExam);

await supabase
.from("results")
.insert(insertData);

alert("Result Saved");

setResultExists(true);

};

const addExam=async()=>{

if(!newExam)return;

await supabase
.from("exam_types")
.insert([{name:newExam}]);

setNewExam("");

setShowExamModal(false);

fetchExamTypes();

};

const addSubject=()=>{

if(!newSubject)return;

setSubjects([...subjects,newSubject]);

setNewSubject("");

setShowSubjectModal(false);

};

const deleteSubject=(sub)=>{

setSubjects(subjects.filter(s=>s!==sub));

};

return(

<div className="admin-result-container">

<img src={JSON.parse(localStorage.getItem("schoolData") || "{}").school_logo || "/logo.png"} className="logo"/>

<h2>{JSON.parse(localStorage.getItem("schoolData") || "{}").school_name || "School Portal"}</h2>

<h3>Upload Result</h3>

<select

value={selectedExam}

onChange={(e)=>setSelectedExam(e.target.value)}

>

<option value="">Select Exam</option>

{

examTypes.map(exam=>(

<option key={exam.id} value={exam.id}>

{exam.name}

</option>

))

}

</select>

<div className="inline-buttons">

<button onClick={()=>setShowExamModal(true)}>

Add Exam

</button>

<button onClick={()=>setShowSubjectModal(true)}>

Add Subject

</button>

</div>

<div className="marks-table">

<div className="table-header">

<span>Subject</span>

<span>Marks</span>

<span>Delete</span>

</div>

{

subjects.map(sub=>(

<div key={sub} className="table-row">

<span>{sub}</span>

<input
type="number"
max="100"
value={marks[sub]||""}
onChange={(e)=>handleMarkChange(sub,e.target.value)}
/>

<FaTrash
className="delete-icon"
onClick={()=>deleteSubject(sub)}
/>

</div>

))

}

</div>

<button
className="save-btn"
onClick={handleSave}
>

Save Result

</button>

{

resultExists &&

<button
className="view-result-btn"
onClick={()=>navigate(`/StudentResult/${studentId}`)}
>

View Result

</button>

}

{
showExamModal &&

<div className="modal-overlay">

<div className="modal">

<h3>Add Exam</h3>

<input
value={newExam}
onChange={(e)=>setNewExam(e.target.value)}
placeholder="Exam Name"
/>

<div className="modal-buttons">

<button onClick={addExam}>

Save

</button>

<button onClick={()=>setShowExamModal(false)}>

Cancel

</button>

</div>

</div>

</div>

}

{
showSubjectModal &&

<div className="modal-overlay">

<div className="modal">

<h3>Add Subject</h3>

<input
value={newSubject}
onChange={(e)=>setNewSubject(e.target.value)}
placeholder="Subject Name"
/>

<div className="modal-buttons">

<button onClick={addSubject}>

Add

</button>

<button onClick={()=>setShowSubjectModal(false)}>

Cancel

</button>

</div>

</div>

</div>

}

</div>

);

}
