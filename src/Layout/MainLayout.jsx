import { Outlet } from "react-router-dom";
import "./MainLayout.css";
import Header from "../Components/Header";
import EducationAtmosphere from "../Components/EducationAtmosphere";

export default function MainLayout() {
  return (
    <main className="app-content">
      <EducationAtmosphere />
      <Header />
      <Outlet />
    </main>
  );
}
