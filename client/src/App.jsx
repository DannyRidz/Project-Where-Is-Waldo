import { useState, useEffect } from "react";
import Header from "./components/Header";
import GameImage from "./components/GameImage";
import FeedbackToast from "./components/FeedbackToast";
import WinModal from "./components/WinModal";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function App() {
  const [map, setMap] = useState(null);
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [foundCharacters, setFoundCharacters] = useState([]);
  const [foundMarkers, setFoundMarkers] = useState([]);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const loadMaps = async () => {
    try {
      const response = await fetch(`${API_BASE}/maps`);
      const availableMaps = await response.json();
      setMaps(availableMaps);
      if (availableMaps.length) setSelectedMapId(availableMaps[0].id);
    } catch (err) {
      console.error("Failed to load maps:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const initGame = async (mapId = selectedMapId) => {
    if (!mapId) return;
    try {
      setIsLoading(true);
      setFoundCharacters([]);
      setFoundMarkers([]);
      setShowWinModal(false);
      setElapsedSeconds(0);
      setToast(null);

      const mapDetailRes = await fetch(`${API_BASE}/maps/${mapId}`);
      const mapData = await mapDetailRes.json();
      setMap(mapData);

      const sessionRes = await fetch(`${API_BASE}/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId }),
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
    // Loading remote data is the purpose of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMaps();
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
      // Stop the client timer when the last character is found.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        ) : !map ? (
          <section className="map-picker">
            <h2>Choose your search</h2>
            <p>Pick a scene to start a new game.</p>
            <div className="map-cards">
              {maps.map((availableMap) => (
                <button
                  className={`map-card ${selectedMapId === availableMap.id ? "selected" : ""}`}
                  key={availableMap.id}
                  onClick={() => setSelectedMapId(availableMap.id)}
                  aria-pressed={selectedMapId === availableMap.id}
                >
                  <img src={availableMap.imageUrl} alt="" />
                  <span>{availableMap.name}</span>
                </button>
              ))}
            </div>
            <button className="start-game-button" onClick={() => initGame()} disabled={!selectedMapId}>
              Start game
            </button>
          </section>
        ) : (
          <GameImage
            key={map.id}
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
          mapName={map?.name}
          finalTime={elapsedSeconds}
          apiBase={API_BASE}
          onPlayAgain={() => initGame(map?.id)}
        />
      )}
    </div>
  );
}

export default App;
