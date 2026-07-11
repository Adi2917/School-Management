import { Outlet } from "react-router-dom";
import "./MainLayout.css";
import Header from "../Components/Header";

export default function MainLayout() {
  return (
    <main className="app-content">
      <Header />
      <Outlet />
    </main>
  );
}
