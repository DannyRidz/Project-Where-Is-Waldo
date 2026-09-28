import { useEffect, useRef, useState } from "react";

function FeedbackToast({ message, type, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message) return;

    let dismissTimer;
    const showTimer = setTimeout(() => setVisible(true), 0);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      dismissTimer = setTimeout(() => dismissRef.current(), 300);
    }, 2000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
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
