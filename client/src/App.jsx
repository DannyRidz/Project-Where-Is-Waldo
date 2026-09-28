import { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import GameImage from "./components/GameImage";
import FeedbackToast from "./components/FeedbackToast";
import WinModal from "./components/WinModal";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function App() {
  const [roundNumber, setRoundNumber] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(null);
  const [finalTime, setFinalTime] = useState(null);
  const [qualifiesForLeaderboard, setQualifiesForLeaderboard] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const sessionStarting = useRef(false);
  const validationPending = useRef(false);
  const roundVersion = useRef(0);
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
      if (!response.ok) throw new Error("Could not load the map list.");
      const availableMaps = await response.json();
      setLoadError(null);
      setMaps(availableMaps);
      if (availableMaps.length) setSelectedMapId(availableMaps[0].id);
    } catch (err) {
      console.error("Failed to load maps:", err);
      setLoadError("Could not load the maps. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const initGame = async (mapId = selectedMapId) => {
    if (!mapId) return;
    const version = ++roundVersion.current;

    setIsLoading(true);
    setIsGameActive(false);
    setSessionId(null);
    setMap(null);
    setFoundCharacters([]);
    setFoundMarkers([]);
    setShowWinModal(false);
    setElapsedSeconds(0);
    setTimerStartedAt(null);
    setFinalTime(null);
    setQualifiesForLeaderboard(false);
    setToast(null);
    setLoadError(null);
    setIsValidating(false);
    validationPending.current = false;

    sessionStarting.current = false;

    try {
      const response = await fetch(`${API_BASE}/maps/${mapId}`);

      if (!response.ok) {
        throw new Error("Could not load this map.");
      }

      const mapData = await response.json();
      if (version !== roundVersion.current) return;

      setRoundNumber((previous) => previous + 1);
      setMap(mapData);
    } catch (error) {
      if (version !== roundVersion.current) return;
      setToast({
        message: error.message,
        type: "error",
      });
    } finally {
      if (version === roundVersion.current) setIsLoading(false);
    }
  };

  const handleImageReady = async () => {
    if (!map || sessionStarting.current) return;
    sessionStarting.current = true;
    const version = roundVersion.current;

    try {
      const response = await fetch(`${API_BASE}/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId: map.id }),
      });
      if (!response.ok) throw new Error("Could not start the round.");
      const data = await response.json();
      if (version !== roundVersion.current) return;
      setSessionId(data.sessionId);
      setTimerStartedAt(Date.now());
      setIsGameActive(true);
    } catch (error) {
      if (version !== roundVersion.current) return;
      sessionStarting.current = false;
      setLoadError(`${error.message} Try starting the round again.`);
    }
  };

  const chooseAnotherMap = () => {
    roundVersion.current += 1;
    setShowWinModal(false);
    setIsGameActive(false);
    setSessionId(null);
    setMap(null);
    setLoadError(null);
  };

  // Initialize on first load
  useEffect(() => {
    // Loading remote data is the purpose of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMaps();
  }, []);

  // Timer — tick while game is active
  useEffect(() => {
    if (!isGameActive || timerStartedAt === null) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - timerStartedAt) / 1000);

      setElapsedSeconds(seconds);
    }, 250);

    return () => clearInterval(interval);
  }, [isGameActive, timerStartedAt]);

  const showToast = (message, type) =>
    setToast({ id: Date.now(), message, type });
  const clearToast = () => setToast(null);

  const handleSelectCharacter = async (characterId, coords) => {
    if (
      !isGameActive ||
      validationPending.current ||
      !sessionId ||
      foundCharacters.includes(characterId)
    ) {
      return;
    }

    validationPending.current = true;
    setIsValidating(true);

    try {
      const response = await fetch(
        `${API_BASE}/sessions/${sessionId}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId,
            x: coords.x,
            y: coords.y,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Validation failed.");
      }

      if (!data.isCorrect) {
        showToast("Not quite! Keep looking...", "error");
        return;
      }

      setFoundCharacters((previous) =>
        previous.includes(data.characterId)
          ? previous
          : [...previous, data.characterId],
      );

      setFoundMarkers((previous) =>
        previous.some((marker) => marker.id === data.characterId)
          ? previous
          : [
              ...previous,
              {
                id: data.characterId,
                name: data.characterName,
                xMin: data.marker.x,
                xMax: data.marker.x,
                yMin: data.marker.y,
                yMax: data.marker.y,
              },
            ],
      );

      showToast(`You found ${data.characterName}!`, "success");

      if (data.completed) {
        setIsGameActive(false);
        setFinalTime(data.timeInSeconds);
        setElapsedSeconds(Math.floor(data.timeInSeconds));
        setQualifiesForLeaderboard(data.qualifiesForLeaderboard);
        setShowWinModal(true);
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      validationPending.current = false;
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
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={clearToast}
        />
      )}

      <main className="game-main">
        {loadError ? (
          <section className="map-picker" role="alert">
            <p>{loadError}</p>
            <button className="start-game-button" onClick={map ? () => initGame(map.id) : loadMaps}>
              Try again
            </button>
          </section>
        ) : isLoading ? (
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
            <button
              className="start-game-button"
              onClick={() => initGame()}
              disabled={!selectedMapId}
            >
              Start game
            </button>
          </section>
        ) : (
          <section className="round-view">
          <div className="round-controls">
            <button className="secondary-button" onClick={chooseAnotherMap} disabled={isValidating}>Choose another map</button>
            <span role="status">{isValidating ? "Checking your tag…" : !sessionId ? "Starting the round…" : "Click a character to identify them."}</span>
          </div>
          <GameImage
            key={`${map.id}-${roundNumber}`}
            map={map}
            foundCharacters={foundCharacters}
            foundMarkers={foundMarkers}
            onSelectCharacter={handleSelectCharacter}
            onImageReady={handleImageReady}
            isGameActive={isGameActive && !isValidating}
          />
          </section>
        )}
      </main>

      {showWinModal && (
        <WinModal
          sessionId={sessionId}
          mapId={map?.id}
          mapName={map?.name}
          finalTime={finalTime}
          qualifiesForLeaderboard={qualifiesForLeaderboard}
          apiBase={API_BASE}
          onPlayAgain={() => initGame(map?.id)}
          onChooseMap={chooseAnotherMap}
        />
      )}
    </div>
  );
}

export default App;
