import { useState, useEffect } from "react";
import Header from "./components/Header";
import GameImage from "./components/GameImage";
import FeedbackToast from "./components/FeedbackToast";
import "./App.css";

const API_BASE = "http://localhost:5001/api";

function App() {
  const [map, setMap] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [foundCharacters, setFoundCharacters] = useState([]); // Array of found character IDs
  const [foundMarkers, setFoundMarkers] = useState([]); // Array of found character objects (for markers)
  const [isGameActive, setIsGameActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null); // { message, type }
  const [isValidating, setIsValidating] = useState(false); // Prevent double-clicks

  useEffect(() => {
    async function initGame() {
      try {
        setIsLoading(true);
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
    }
    initGame();
  }, []);

  // Check win condition whenever foundCharacters changes
  useEffect(() => {
    if (!map || !isGameActive) return;
    const totalCharacters = map.characters?.length ?? 0;
    if (totalCharacters > 0 && foundCharacters.length === totalCharacters) {
      setIsGameActive(false); // Stop the timer
      // Step 8 & 9 will handle the win modal here
      console.log("You found all characters! Session ID:", sessionId);
    }
  }, [foundCharacters, map, isGameActive]);

  const showToast = (message, type) => {
    setToast({ message, type });
  };

  const clearToast = () => setToast(null);

  // Called when user selects a character from the dropdown
  const handleSelectCharacter = async (characterId, coords) => {
    if (isValidating || !sessionId) return;

    try {
      setIsValidating(true);

      const res = await fetch(`${API_BASE}/sessions/${sessionId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          x: coords.x,
          y: coords.y,
        }),
      });

      const data = await res.json();

      if (data.isCorrect) {
        // Mark character as found
        setFoundCharacters((prev) => [...prev, data.characterId]);

        // Find the full character object from map data to get bounding box for the marker
        const foundChar = map.characters.find((c) => c.id === data.characterId);
        // Enrich with bounding box info from a separate call (or use midpoint from coords)
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

        showToast(`🎉 Great job! You found ${data.characterName}!`, "success");
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

  return (
    <div className="app-container">
      {map && (
        <Header
          characters={map.characters || []}
          foundCharacters={foundCharacters}
          isGameActive={isGameActive}
        />
      )}

      {/* Toast Notification */}
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
    </div>
  );
}

export default App;
