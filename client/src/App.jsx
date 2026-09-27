import { useState, useEffect } from "react";
import Header from "./components/Header";
import GameImage from "./components/GameImage";
import FeedbackToast from "./components/FeedbackToast";
import WinModal from "./components/WinModal";
import "./App.css";

const API_BASE = "http://localhost:5001/api";

function App() {
  const [map, setMap] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [foundCharacters, setFoundCharacters] = useState([]);
  const [foundMarkers, setFoundMarkers] = useState([]);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const initGame = async () => {
    try {
      setIsLoading(true);
      setFoundCharacters([]);
      setFoundMarkers([]);
      setShowWinModal(false);
      setElapsedSeconds(0);
      setToast(null);

      const mapsRes = await fetch(`${API_BASE}/maps`);
      const maps = await mapsRes.json();
      if (!maps || maps.length === 0) return;

      const currentMapId = maps[0].id;
      const mapDetailRes = await fetch(`${API_BASE}/maps/${currentMapId}`);
      const mapData = await mapDetailRes.json();
      setMap(mapData);

      const sessionRes = await fetch(`${API_BASE}/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId: currentMapId }),
      });
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.sessionId);
      setIsGameActive(true);
    } catch (err) {
      console.error("Failed to initialize game:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on first load
  useEffect(() => {
    initGame();
  }, []);

  // Timer — tick while game is active
  useEffect(() => {
    if (!isGameActive) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameActive]);

  // Win condition check
  useEffect(() => {
    if (!map || !isGameActive) return;
    const totalCharacters = map.characters?.length ?? 0;
    if (totalCharacters > 0 && foundCharacters.length === totalCharacters) {
      setIsGameActive(false);
      // Small delay so the last success toast is visible before the modal appears
      setTimeout(() => setShowWinModal(true), 1500);
    }
  }, [foundCharacters, map, isGameActive]);

  const showToast = (message, type) => setToast({ message, type });
  const clearToast = () => setToast(null);

  const handleSelectCharacter = async (characterId, coords) => {
    if (isValidating || !sessionId) return;

    try {
      setIsValidating(true);

      const res = await fetch(`${API_BASE}/sessions/${sessionId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, x: coords.x, y: coords.y }),
      });
      const data = await res.json();

      if (data.isCorrect) {
        setFoundCharacters((prev) => [...prev, data.characterId]);
        setFoundMarkers((prev) => [
          ...prev,
          {
            id: data.characterId,
            name: data.characterName,
            xMin: coords.x - 2,
            xMax: coords.x + 2,
            yMin: coords.y - 2,
            yMax: coords.y + 2,
          },
        ]);
        showToast(`🎉 You found ${data.characterName}!`, "success");
      } else {
        showToast("❌ Not quite! Keep looking...", "error");
      }
    } catch (err) {
      console.error("Validation error:", err);
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsValidating(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="app-container">
      {map && (
        <Header
          characters={map.characters || []}
          foundCharacters={foundCharacters}
          isGameActive={isGameActive}
          elapsedSeconds={elapsedSeconds}
          formatTime={formatTime}
        />
      )}

      {toast && (
        <FeedbackToast
          message={toast.message}
          type={toast.type}
          onDismiss={clearToast}
        />
      )}

      <main className="game-main">
        {isLoading ? (
          <div className="loading-spinner">Loading game map...</div>
        ) : (
          <GameImage
            map={map}
            foundCharacters={foundCharacters}
            foundMarkers={foundMarkers}
            onSelectCharacter={handleSelectCharacter}
          />
        )}
      </main>

      {showWinModal && (
        <WinModal
          sessionId={sessionId}
          mapId={map?.id}
          finalTime={elapsedSeconds}
          apiBase={API_BASE}
          onPlayAgain={initGame}
        />
      )}
    </div>
  );
}

export default App;
