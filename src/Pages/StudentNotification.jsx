import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./StudentNotification.css";

export default function StudentNotification() {

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setNotifications(data);
    }
  };

  return (
    <div className="student-overlay">

      <div className="student-card">

        <h2>Notifications</h2>

        {notifications.length === 0 && <p>No Notifications Yet</p>}

        {notifications.map((item) => (
          <div key={item.id} className="chat-bubble">

            <h4>{item.tittle || item.title}</h4>
            <p>{item.message}</p>

            {item.image_url && item.image_url.includes(".mp4") ? (
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
