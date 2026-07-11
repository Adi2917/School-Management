import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionDestination } from "../session";
import { ArrowRight, BarChart3, BookOpen, Building2, CheckCircle2, GraduationCap, ShieldCheck, Sparkles, Users } from "lucide-react";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    const destination = getSessionDestination();
    if (destination) navigate(destination, { replace: true });
  }, [navigate]);
  return <div className="landing-page">
    <nav className="landing-nav">
      <button className="brand" onClick={() => navigate("/")} aria-label="Connect Your School home">
        <span className="brand-mark"><BookOpen size={25}/><i /></span>
        <span>Connect <b>Your School</b></span>
      </button>
      <div className="nav-links"><a href="#features">Features</a><a href="#platform">Platform</a></div>
      <button className="nav-cta" onClick={() => navigate("/StudentChoice")}>Open portal <ArrowRight size={17}/></button>
    </nav>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15}/> Built for modern schools</span>
          <h1>School management,<br/><em>beautifully connected.</em></h1>
          <p>Bring students, administrators and everyday school work together in one secure, simple platform.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => navigate("/SchoolRegister")}>Register your school <ArrowRight size={19}/></button>
            <button className="secondary-action" onClick={() => navigate("/StudentChoice")}>Join your school</button>
          </div>
          <div className="trust-row"><span><CheckCircle2/> Easy setup</span><span><CheckCircle2/> Secure records</span><span><CheckCircle2/> Student friendly</span></div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="sun-shape"/><div className="dot-grid"/>
          <div className="portal-preview">
            <div className="preview-head"><span className="mini-mark"><BookOpen/></span><div><small>WELCOME BACK</small><strong>Good morning, Admin</strong></div><span className="avatar">AS</span></div>
            <div className="preview-stats"><div><Users/><span><b>1,248</b><small>Students</small></span></div><div><BarChart3/><span><b>92%</b><small>Attendance</small></span></div></div>
            <div className="preview-panel"><div className="panel-title"><b>School overview</b><span>This week</span></div><div className="bars">{[44,68,53,81,64,90,73].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div></div>
          </div>
          <div className="floating-card float-one"><ShieldCheck/><span><b>Secure & private</b><small>Your data stays protected</small></span></div>
          <div className="floating-card float-two"><GraduationCap/><span><b>Everything in one place</b><small>Results, fees & updates</small></span></div>
        </div>
      </section>

      <section className="feature-strip" id="features">
        <div><Building2/><span><b>School workspace</b><small>Manage your institution</small></span></div>
        <div><Users/><span><b>Student profiles</b><small>Organized and accessible</small></span></div>
        <div><BarChart3/><span><b>Results & fees</b><small>Clear academic insights</small></span></div>
        <div><ShieldCheck/><span><b>Protected access</b><small>Role-based experience</small></span></div>
      </section>

      <section className="choice-section" id="platform">
        <span className="eyebrow">YOUR SCHOOL, YOUR WAY</span><h2>Ready to bring everyone together?</h2>
        <div className="choice-grid">
          <article><span className="choice-number">01</span><Building2/><h3>Create a school workspace</h3><p>Register your institution and begin managing your school community in minutes.</p><button onClick={() => navigate("/SchoolRegister")}>Get started <ArrowRight/></button></article>
          <article className="choice-dark"><span className="choice-number">02</span><GraduationCap/><h3>Enter your school portal</h3><p>Students and administrators can securely access their dedicated experience.</p><button onClick={() => navigate("/StudentChoice")}>Join now <ArrowRight/></button></article>
        </div>
      </section>
    </main>
    <footer><span className="brand"><span className="brand-mark"><BookOpen size={20}/></span><span>Connect <b>Your School</b></span></span><p>One community. One connected school.</p></footer>
  </div>;
}
