import { BookOpen, FlaskConical, GraduationCap, Library, School, ShieldCheck, Sparkles, Users } from "lucide-react";

export default function EducationPanel({ mode = "student" }) {
  const school = mode === "school";
  return <aside className="education-panel">
    <div className="education-panel__brand"><span><BookOpen /></span><div>Connect <b>Your School</b></div></div>
    <div className="education-panel__copy">
      <span className="education-panel__eyebrow"><Sparkles/> SMART EDUCATION PLATFORM</span>
      <h1>{school ? "Build a stronger school community." : "Your learning journey starts here."}</h1>
      <p>{school ? "Bring administration, classrooms and families into one organized digital campus." : "Stay connected with your school, academic progress and every important update."}</p>
    </div>
    <div className="education-panel__features">
      <div><span><School/></span><b>Digital campus</b><small>One connected workspace</small></div>
      <div><span><Library/></span><b>Library & learning</b><small>Knowledge within reach</small></div>
      <div><span><FlaskConical/></span><b>Labs & results</b><small>Track academic growth</small></div>
      <div><span><Users/></span><b>School community</b><small>Everyone stays informed</small></div>
    </div>
    <div className="education-panel__trust"><ShieldCheck/> Secure school-first access</div>
    <GraduationCap className="education-panel__watermark"/>
  </aside>;
}
