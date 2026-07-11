import React,{useEffect,useState} from "react";
import {useParams} from "react-router-dom";
import {supabase} from "../supabaseClient";
import {FaTimes} from "react-icons/fa";
import "./StudentResult.css";

export default function StudentResult(){

const {studentId}=useParams();

const [examList,setExamList]=useState([]);

const [results,setResults]=useState([]);

const [selectedExam,setSelectedExam]=useState(null);

const [examName,setExamName]=useState("");

useEffect(()=>{

fetchExamList();

},[]);


const fetchExamList=async()=>{

const {data}=await supabase
.from("results")
.select("exam_type_id,exam_types(name)")
.eq("student_id",studentId);

if(data){

const unique=Object.values(

data.reduce((acc,item)=>{

acc[item.exam_type_id]=item;

return acc;

},{})

);

setExamList(unique);

}

};


const openResult=async(examId,name)=>{

setExamName(name);

const {data}=await supabase
.from("results")
.select("*")
.eq("student_id",studentId)
.eq("exam_type_id",examId);

setResults(data);

setSelectedExam(true);

};


const total=results.reduce(
(sum,item)=>sum+(item.marks||0),0
);

const percent=results.length>0
?
(total/(results.length*100))*100
:
0;

return(

<div className="result-page">

<h2 className="page-title">

Student Result

</h2>

{
examList.length===0
?
<h3>Result Not Available</h3>

:
<div className="exam-btn-box">

{
examList.map(exam=>(

<button
key={exam.exam_type_id}
className="exam-btn"
onClick={()=>
openResult(
exam.exam_type_id,
exam.exam_types.name
)
}
>

{exam.exam_types.name}

</button>

))
}

</div>
}



{
selectedExam &&

<div className="overlay">

<div className="marksheet">

<FaTimes
className="close"
onClick={()=>setSelectedExam(false)}
/>


<img
src={JSON.parse(localStorage.getItem("schoolData") || "{}").school_logo || "/logo.png"}
className="school-logo"
/>


<h2 className="school-name">

{JSON.parse(localStorage.getItem("schoolData") || "{}").school_name || "School Portal"}

</h2>


<h3 className="exam-title">

{examName} Examination

</h3>



<div className="table">

<div className="row header">

<div>Subject</div>

<div>Marks</div>

</div>

{
results.map(item=>(

<div className="row" key={item.id}>

<div>

{item.subject}

</div>

<div>

{item.marks}

</div>

</div>

))
}

</div>


<div className="summary">

Total : {total}

<br/>

Percentage : {percent.toFixed(2)}%

</div>


<button
className="print"
onClick={()=>window.print()}
>

Print

</button>


</div>

</div>

}

</div>

);

}
