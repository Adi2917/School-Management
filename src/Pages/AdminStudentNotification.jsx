import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { uploadMedia } from "../mediaClient";
import "./AdminStudentNotification.css";

export default function AdminStudentNotification() {
  const activeSchool = JSON.parse(localStorage.getItem("schoolData") || localStorage.getItem("adminData") || "{}");
  const schoolCode = activeSchool.school_code || "";
  const [tittle, setTittle] = useState("");
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [editMediaType, setEditMediaType] = useState(null);

  const fetchNotifications = async () => {
    if (!schoolCode) return setNotifications([]);
    const { data } = await supabase.from("notifications").select("*").eq("school_code", schoolCode).order("created_at", { ascending: false });
    setNotifications(data || []);
  };

  useEffect(() => { fetchNotifications(); }, [schoolCode]);

  const handleUpload = async () => {
    if (!schoolCode) return alert("School session missing. Please login again.");
    if (!tittle.trim() || !message.trim()) return alert("Title and message required");
    setLoading(true);
    try {
      let image_url = null, file_url = null;
      if (media) {
        const url = await uploadMedia(media);
        if (mediaType === "image" || mediaType === "video") image_url = url;
        else file_url = url;
      }
      const { error } = await supabase.from("notifications").insert([{ tittle: tittle.trim(), message: message.trim(), image_url, file_url, media_type: mediaType, student_id: null, school_code: schoolCode, created_at: new Date().toISOString() }]);
      if (error) throw error;
      setTittle(""); setMessage(""); setMedia(null); setMediaType(null);
      await fetchNotifications();
    } catch (error) { alert(error.message || "Notification upload failed"); }
    finally { setLoading(false); }
  };

  const openEditor = item => { setEditing({ ...item }); setEditFile(null); setEditMediaType(null); };
  const saveEdit = async () => {
    if (!editing.tittle?.trim() || !editing.message?.trim()) return alert("Title and message required");
    setLoading(true);
    try {
      const changes = { tittle: editing.tittle.trim(), message: editing.message.trim() };
      if (editFile) {
        const url = await uploadMedia(editFile);
        changes.media_type = editMediaType;
        changes.image_url = editMediaType === "image" || editMediaType === "video" ? url : null;
        changes.file_url = editMediaType === "file" ? url : null;
      }
      const { error } = await supabase.from("notifications").update(changes).eq("id", editing.id).eq("school_code", schoolCode);
      if (error) throw error;
      setEditing(null); await fetchNotifications();
    } catch (error) { alert(error.message || "Update failed"); }
    finally { setLoading(false); }
  };

  const handleDelete = async item => {
    if (!confirm(`Delete “${item.tittle}”? It will also disappear from student panels.`)) return;
    const { error } = await supabase.from("notifications").delete().eq("id", item.id).eq("school_code", schoolCode);
    if (error) return alert(error.message || "Delete failed");
    if (editing?.id === item.id) setEditing(null);
    fetchNotifications();
  };

  const mediaInput = (accept, type, label, setter = setMedia, typeSetter = setMediaType) => <label className="icon-btn" title={label}>{label}<input type="file" accept={accept} hidden onChange={e => { setter(e.target.files?.[0] || null); typeSetter(type); }}/></label>;

  return <div className="admin-container notification-admin">
    <section className="upload-box">
      <small className="section-kicker">NOTICE DESK</small><h2>Create notification</h2>
      <p className="section-copy">Only students registered with school code <b>{schoolCode}</b> will receive it.</p>
      <input placeholder="Notification title" value={tittle} onChange={e => setTittle(e.target.value)}/>
      <textarea placeholder="Write your message..." value={message} onChange={e => setMessage(e.target.value)}/>
      <div className="media-options">{mediaInput("image/*", "image", "Image")}{mediaInput("video/*", "video", "Video")}{mediaInput(".pdf,.doc,.docx", "file", "Document")}</div>
      {media && <p className="preview-name">Selected: {media.name}</p>}
      <button onClick={handleUpload} disabled={loading}>{loading ? "Saving..." : "Send notification"}</button>
    </section>
    <section className="list-box"><div className="list-heading"><div><small className="section-kicker">PUBLISHED</small><h3>School notifications</h3></div><span>{notifications.length} notices</span></div>
      {!notifications.length && <div className="empty-notices">No notifications published for this school yet.</div>}
      <div className="notice-grid">{notifications.map(item => <article key={item.id} className="notification-card" onClick={() => openEditor(item)}>
        <div className="card-top"><h4>{item.tittle}</h4><button className="delete-icon" onClick={e => { e.stopPropagation(); handleDelete(item); }} aria-label="Delete">Delete</button></div>
        <p>{item.message}</p>
        {item.media_type === "video" && item.image_url ? <video controls className="media-preview" onClick={e => e.stopPropagation()} src={item.image_url}/> : item.image_url && <img src={item.image_url} alt="Notification attachment" className="media-preview"/>}
        {item.file_url && <a href={item.file_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>Open document</a>}
        <small>{new Date(item.created_at).toLocaleString()} · Click to edit</small>
      </article>)}</div>
    </section>
    {editing && <div className="popup-overlay" onMouseDown={() => setEditing(null)}><div className="notification-editor" onMouseDown={e => e.stopPropagation()}>
      <div className="editor-heading"><div><small className="section-kicker">EDIT NOTICE</small><h3>Update notification</h3></div><button onClick={() => setEditing(null)}>×</button></div>
      <label>Title<input value={editing.tittle || ""} onChange={e => setEditing({ ...editing, tittle: e.target.value })}/></label>
      <label>Message<textarea value={editing.message || ""} onChange={e => setEditing({ ...editing, message: e.target.value })}/></label>
      {(editing.image_url || editing.file_url) && <div className="current-attachment"><small className="section-kicker">CURRENT ATTACHMENT</small>{editing.media_type === "video" && editing.image_url ? <video controls src={editing.image_url}/> : editing.image_url ? <img src={editing.image_url} alt="Current notification attachment"/> : <a href={editing.file_url} target="_blank" rel="noreferrer">Open current document</a>}</div>}
      <div className="media-options">{mediaInput("image/*", "image", "Replace image", setEditFile, setEditMediaType)}{mediaInput("video/*", "video", "Replace video", setEditFile, setEditMediaType)}{mediaInput(".pdf,.doc,.docx", "file", "Replace file", setEditFile, setEditMediaType)}</div>
      {editFile && <p className="preview-name">New attachment: {editFile.name}</p>}
      <div className="editor-actions"><button className="danger-button" onClick={() => handleDelete(editing)}>Delete</button><button onClick={saveEdit} disabled={loading}>{loading ? "Saving..." : "Save changes"}</button></div>
    </div></div>}
  </div>;
}
