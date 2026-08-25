import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./PinInput.css";

export default function PinInput(props) {
  const [visible, setVisible] = useState(false);
  return <span className="pin-input-shell"><input {...props} type={visible ? "text" : "password"}/><button type="button" className="pin-visibility" onClick={() => setVisible(value => !value)} aria-label={visible ? "Hide PIN" : "Show PIN"}>{visible ? <EyeOff/> : <Eye/>}</button></span>;
}
