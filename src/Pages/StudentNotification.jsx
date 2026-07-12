import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./StudentNotification.css";

export default function StudentNotification() {
  const student = JSON.parse(localStorage.getItem("studentData") || "{}");
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;
    supabase.from("notifications").select("*").eq("school_code", student.school_code || "__missing_school__").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (active && !error) setNotifications(data || []);
    });
    return () => { active = false; };
  }, [student.school_code]);

  return (
    <div className="student-overlay">

      <div className="student-card">

        <h2>Notifications</h2>

        {notifications.length === 0 && <p>No Notifications Yet</p>}

        {notifications.map((item) => (
          <div key={item.id} className="chat-bubble">

            <h4>{item.tittle || item.title}</h4>
            <p>{item.message}</p>

            {item.image_url && item.media_type === "video" ? (
              <video controls>
                <source src={item.image_url} type="video/mp4" />
              </video>
            ) : item.image_url ? (
              <img src={item.image_url} alt="media"/>
            ) : null}

            {item.file_url && (
              <a href={item.file_url} target="_blank" rel="noreferrer">
                📄 Download Document
              </a>
            )}

            <span className="time">
              {new Date(item.created_at).toLocaleString()}
            </span>

          </div>
        ))}

      </div>
    </div>
  );
}
