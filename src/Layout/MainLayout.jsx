import { Outlet } from "react-router-dom";
import "./MainLayout.css";

export default function MainLayout() {
  return (
    <main className="app-content">
      <Outlet />
    </main>
  );
}
