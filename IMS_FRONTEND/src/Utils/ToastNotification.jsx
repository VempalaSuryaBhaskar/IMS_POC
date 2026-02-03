import React, { useEffect } from "react";
import "./ToastNotification.css";

export default function ToastNotification({ type, message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast-notification ${type}`}>
      <div className="toast-content">
        <i
          className={`fa-solid ${
            type === "success" ? "fa-circle-check" : "fa-circle-exclamation"
          }`}
        ></i>
        <span>{message}</span>
      </div>
    </div>
  );
}
