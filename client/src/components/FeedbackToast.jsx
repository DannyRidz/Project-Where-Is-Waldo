import { useEffect, useState } from "react";

function FeedbackToast({ message, type, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade-out before clearing
    }, 2000);

    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className={`feedback-toast ${type} ${visible ? "show" : ""}`}>
      <span className="toast-icon">{type === "success" ? "✅" : "❌"}</span>
      <span>{message}</span>
    </div>
  );
}

export default FeedbackToast;
