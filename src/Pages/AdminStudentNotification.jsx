import React, { useEffect, useState } from "react";
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
  const [showPopup, setShowPopup] = useState(false);

  // ================= FETCH =================
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("school_code", schoolCode)
      .order("created_at", { ascending: false });

    if (data) setNotifications(data);
  };

  // ================= REALTIME =================
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("realtime-admin-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolCode]);

  // ================= UPLOAD =================
  const handleUpload = async () => {
    if (!tittle || !message) {
      alert("Title and Message required");
      return;
    }

    setLoading(true);

    let image_url = null;
    let file_url = null;

    const deviceTime = new Date().toISOString();

    if (media) {
      try {
        const uploadedUrl = await uploadMedia(media);
        if (mediaType === "image" || mediaType === "video") image_url = uploadedUrl;
        else file_url = uploadedUrl;
      } catch (error) {
        console.error(error);
        setLoading(false);
        alert("Media upload failed");
        return;
      }
    }

    const { error } = await supabase.from("notifications").insert([
      {
        tittle,
        message,
        image_url,
        file_url,
        media_type: mediaType,
        student_id: null,
        school_code: schoolCode,
        created_at: deviceTime,
      },
    ]);

    setLoading(false);

    if (!error) {
      setShowPopup(true);
      setTittle("");
      setMessage("");
      setMedia(null);

      setTimeout(() => setShowPopup(false), 2000);
    } else {
      console.log(error);
      alert("Upload Failed");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    await supabase.from("notifications").delete().eq("id", id);
    fetchNotifications();
  };

  return (
    <div className="admin-container">
      {/* ================= Upload Section ================= */}
      <div className="upload-box">
        <h2>Upload Notification</h2>

        <input
          type="text"
          placeholder="Enter Title"
          value={tittle}
          onChange={(e) => setTittle(e.target.value)}
        />

        <textarea
          placeholder="Write your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="media-options">
          {/* Image */}
          <label className="icon-btn">
            🖼
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                setMedia(e.target.files[0]);
                setMediaType("image");
              }}
            />
          </label>

          {/* Video */}
          <label className="icon-btn">
            🎥
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                setMedia(e.target.files[0]);
                setMediaType("video");
              }}
            />
          </label>

          {/* Document */}
          <label className="icon-btn">
            📄
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={(e) => {
                setMedia(e.target.files[0]);
                setMediaType("file");
              }}
            />
          </label>

          {/* Camera */}
          <label className="icon-btn">
            📷
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                setMedia(e.target.files[0]);
                setMediaType("image");
              }}
            />
          </label>
        </div>

        {media && <p className="preview-name">{media.name}</p>}

        <button onClick={handleUpload}>
          {loading ? "Uploading..." : "Send Notification"}
        </button>
      </div>

      {/* ================= List Section ================= */}
      <div className="list-box">
        <h3>Uploaded Notifications</h3>

        {notifications.map((item) => (
          <div key={item.id} className="notification-card">
            <div className="card-top">
              <h4>{item.tittle}</h4>
              <span
                className="delete-icon"
                onClick={() => handleDelete(item.id)}
              >
                🗑
              </span>
            </div>

            <p>{item.message}</p>

            {item.image_url && (
              <img src={item.image_url} alt="" className="media-preview" />
            )}

            {item.file_url && (
              <a href={item.file_url} target="_blank" rel="noreferrer">
                View Document
              </a>
            )}

            <small>
              {new Date(item.created_at).toLocaleString()}
            </small>
          </div>
        ))}
      </div>

      {/* ================= Popup ================= */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            ✔ Uploaded Successfully
          </div>
        </div>
      )}
    </div>
  );
}
