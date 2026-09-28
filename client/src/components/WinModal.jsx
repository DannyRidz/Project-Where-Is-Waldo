import { useState, useEffect } from "react";

function WinModal({ sessionId, mapId, mapName, finalTime, qualifiesForLeaderboard, apiBase, onPlayAgain, onChooseMap }) {
  const [playerName, setPlayerName] = useState("");
  const [submittedScoreId, setSubmittedScoreId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [scoreError, setScoreError] = useState("");
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchLeaderboard() {
      try {
        const response = await fetch(`${apiBase}/maps/${mapId}/scores`, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load the leaderboard.");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setLeaderboard(data);
        setScoreError("");
      } catch (err) {
        if (err.name !== "AbortError") setScoreError(err.message);
      } finally {
        if (!controller.signal.aborted) setIsLoadingScores(false);
      }
    }
    fetchLeaderboard();
    return () => controller.abort();
  }, [mapId, apiBase, submittedScoreId, reloadCount]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toFixed(2);
    return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = playerName.trim();
    if (!trimmedName) { setError("Please enter your name."); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/sessions/${sessionId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: trimmedName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save score.");
      setSubmittedScoreId(data.score.id);
      setIsLoadingScores(true);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="win-title">
        <h2 className="modal-title" id="win-title">You Found Everyone!</h2>
        <p className="modal-subtitle">{mapName}</p>
        <p className="modal-subtitle">Your time: <strong className="modal-time">{formatTime(finalTime)}</strong></p>
        {qualifiesForLeaderboard && !submittedScoreId ? (
          <form onSubmit={handleSubmit} className="modal-form">
            <label className="modal-prompt" htmlFor="player-name">Enter your name for the leaderboard:</label>
            <input id="player-name" className="modal-input" value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={30} autoFocus required />
            {error && <p className="modal-error" role="alert">{error}</p>}
            <button className="modal-btn primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Submit Score"}</button>
          </form>
        ) : (
          <>
            <p className="modal-prompt">{submittedScoreId ? "Your score has been saved." : "Your time did not qualify for the top ten."}</p>
            <h3>Top Scores</h3>
            <div className="leaderboard">
              {isLoadingScores ? <p role="status">Loading scores…</p> : scoreError ? (
                <div role="alert"><p>{scoreError}</p><button className="secondary-button" onClick={() => { setIsLoadingScores(true); setReloadCount((value) => value + 1); }}>Try again</button></div>
              ) : leaderboard.length === 0 ? <p className="leaderboard-empty">No scores yet.</p> : (
                <table className="leaderboard-table">
                  <thead><tr><th>Rank</th><th>Name</th><th>Time</th></tr></thead>
                  <tbody>{leaderboard.map((score, index) => (
                    <tr key={score.id} className={score.id === submittedScoreId ? "highlight-row" : ""}>
                      <td className="rank">{index + 1}</td><td>{score.playerName}</td><td className="score-time">{formatTime(score.timeInSeconds)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        )}
        <div className="modal-actions">
          <button className="modal-btn primary" onClick={onPlayAgain} disabled={isSubmitting}>Play Again</button>
          <button className="secondary-button" onClick={onChooseMap} disabled={isSubmitting}>Choose another map</button>
        </div>
      </section>
    </div>
  );
}

export default WinModal;
