import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function Toast({
  message,
  error = false,
  dismiss,
}: {
  message: string;
  error?: boolean;
  dismiss: () => void;
}) {
  const [fading, setFading] = useState(false);
  const latestDismiss = useRef(dismiss);
  latestDismiss.current = dismiss;
  useEffect(() => {
    setFading(false);
    const fade = window.setTimeout(() => setFading(true), 5000);
    const close = window.setTimeout(() => latestDismiss.current(), 5250);
    return () => {
      clearTimeout(fade);
      clearTimeout(close);
    };
  }, [message]);
  return (
    <div
      className={`toast ${fading ? "toast-fading" : ""}`}
      role={error ? "alert" : "status"}
    >
      <span>{message}</span>
      <button
        className="icon-button"
        aria-label="Dismiss message"
        onClick={dismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
