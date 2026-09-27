import { useEffect, useRef, useState } from "react";

function FeedbackToast({ message, type, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message) return;

    const showTimer = setTimeout(() => setVisible(true), 0);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => dismissRef.current(), 300); // Wait for fade-out before clearing
    }, 2000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
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
