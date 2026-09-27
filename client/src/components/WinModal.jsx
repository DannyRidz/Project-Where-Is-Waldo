import { useState, useEffect } from "react";

function WinModal({
  sessionId,
  mapId,
  mapName,
  finalTime,
  apiBase,
  onPlayAgain,
}) {
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");

  // Fetch leaderboard once score is submitted
  useEffect(() => {
    if (!submitted) return;

    async function fetchLeaderboard() {
      try {
        const res = await fetch(`${apiBase}/maps/${mapId}/scores`);
        const data = await res.json();
        setLeaderboard(data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
    }

    fetchLeaderboard();
  }, [submitted, mapId, apiBase]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(1);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setError("Please enter your name!");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${apiBase}/sessions/${sessionId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: trimmedName }),
      });
      if (!res.ok) throw new Error("Failed to submit score");
      setSubmitted(true);
      setError("");
    } catch (err) {
      setError("Failed to save score. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {!submitted ? (
          /* Score Submission Screen */
          <>
            <div className="modal-fireworks">🎉</div>
            <h2 className="modal-title">You Found Everyone!</h2>
            <p className="modal-subtitle">
              Your time:{" "}
              <strong className="modal-time">{formatTime(finalTime)}</strong>
            </p>
            <p className="modal-prompt">Enter your name for the leaderboard:</p>

            <form onSubmit={handleSubmit} className="modal-form">
              <input
                type="text"
                className="modal-input"
                placeholder="Your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={30}
                autoFocus
              />
              {error && <p className="modal-error">{error}</p>}
              <button
                type="submit"
                className="modal-btn primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "🏆 Submit Score"}
              </button>
            </form>
          </>
        ) : (
          /* Leaderboard Screen */
          <>
            <h2 className="modal-title">🏆 Top Scores</h2>
            <p className="modal-subtitle">{mapName}</p>
            <div className="leaderboard">
              {leaderboard.length === 0 ? (
                <p className="leaderboard-empty">
                  No scores yet. You're first!
                </p>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((score, index) => (
                      <tr
                        key={score.id}
                        className={
                          score.playerName === playerName ? "highlight-row" : ""
                        }
                      >
                        <td className="rank">
                          {index === 0
                            ? "🥇"
                            : index === 1
                              ? "🥈"
                              : index === 2
                                ? "🥉"
                                : index + 1}
                        </td>
                        <td>{score.playerName}</td>
                        <td className="score-time">
                          {formatTime(score.timeInSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button className="modal-btn primary" onClick={onPlayAgain}>
              🔄 Play Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default WinModal;
