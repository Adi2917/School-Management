import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./StudentFees.css";
import { CalendarCheck, CircleDollarSign, Clock3, ReceiptIndianRupee } from "lucide-react";

const monthsOrder = [
  "March","April","May","June","July","August",
  "September","October","November","December",
  "January","February"
];

export default function StudentFees() {
  const { id } = useParams();
  const [fees, setFees] = useState([]);

  useEffect(() => {
    fetchFees();
  }, [id]);

  const fetchFees = async () => {
    const { data } = await supabase
      .from("fees")
      .select("*")
      .eq("student_id", id);

    if (data) {
      const sorted = monthsOrder.map(month =>
        data.find(f => f.month === month)
      ).filter(Boolean);

      setFees(sorted);
    }
  };

  return (
    <div className="student-wrapper">
      <div className="student-card">

        <div className="fees-hero"><span><ReceiptIndianRupee/></span><div><small>MY ACCOUNTS</small><h2>My Fees Status</h2><p>Track every monthly payment in one place.</p></div></div>
        <div className="fees-summary"><div><CalendarCheck/><span><b>{fees.filter(f=>f.status === "Paid").length}</b><small>Paid months</small></span></div><div><Clock3/><span><b>{fees.filter(f=>f.status !== "Paid").length}</b><small>Pending months</small></span></div><div><CircleDollarSign/><span><b>{fees.length}</b><small>Academic cycle</small></span></div></div>
        <div className="fees-grid">

        {fees.map((fee) => (
          <div key={fee.id} className="student-row">

            <div className="month-name">
              {fee.month}
            </div>

            <div className="right-section">

              <span
                className={`status-dot ${
                  fee.status === "Paid" ? "green" : "red"
                }`}
              ></span>

              <span>{fee.status}</span>

              {fee.status === "Paid" && fee.paid_date && (
                <span className="paid-date">
                  {new Date(fee.paid_date).toLocaleDateString()}
                </span>
              )}

            </div>

          </div>
        ))}</div>

      </div>
    </div>
  );
}
