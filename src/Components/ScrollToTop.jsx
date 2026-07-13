import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
export default function ScrollToTop(){const{pathname}=useLocation();useLayoutEffect(()=>{const reset=()=>{window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body.scrollTop=0;document.querySelectorAll(".app-content,.register-card,.login-card,.notification-editor").forEach(element=>element.scrollTop=0)};reset();requestAnimationFrame(reset)},[pathname]);return null}
