import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <main style={{ minHeight: "100vh", background: "#f6f0e5", color: "#2d2923", padding: "48px 20px" }}>
      <article style={{ maxWidth: 860, margin: "0 auto", background: "#fffdf8", border: "1px solid #e7dac6", borderRadius: 28, padding: "clamp(24px, 5vw, 56px)", boxShadow: "0 24px 60px rgba(45,41,35,.1)" }}>
        <p style={{ color: "#a86708", fontWeight: 800, letterSpacing: 2 }}>CONNECT YOUR SCHOOL</p>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 62px)", margin: "8px 0 12px" }}>Privacy Policy</h1>
        <p>Last updated: 6 August 2026</p>
        <h2>Information we process</h2>
        <p>Schools may provide administrator details, school information and logos. Students may provide their name, parent name, phone number, class, section, roll number, address and an optional profile photo. The platform also stores school notices, fee status and academic results.</p>
        <h2>How information is used</h2>
        <p>Information is used only to operate the school portal, authenticate accounts, display school-specific records and keep the connected administrative data in sync. Records are separated by school code.</p>
        <h2>Security and retention</h2>
        <p>PINs are stored as one-way hashes and are never shown in the app or mirrored to Google Sheets. Login sessions use signed, expiring tokens. Data is retained while the school uses the service or until an authorized deletion request is completed.</p>
        <h2>Photos and files</h2>
        <p>Photo-library access is requested only after you choose to upload a school logo, student photo or notice attachment. The app does not access media in the background.</p>
        <h2>Deletion and support</h2>
        <p>Students can ask their school administrator to correct or delete their record. Schools can manage their records from the administrator portal. For product or deletion support, contact BeyondNull through <a href="https://beyondnull.in" target="_blank" rel="noreferrer">beyondnull.in</a>.</p>
        <p style={{ marginTop: 36 }}><Link to="/">← Return to Connect Your School</Link></p>
      </article>
    </main>
  );
}
