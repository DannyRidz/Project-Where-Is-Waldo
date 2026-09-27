import { useState, useEffect } from "react";
import Header from "./components/Header";
import GameImage from "./components/GameImage";
import "./App.css";

const API_BASE = "http://localhost:5001/api";

function App() {
  const [map, setMap] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [foundCharacters, setFoundCharacters] = useState([]);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize game on load: fetch map data and start server session
  useEffect(() => {
    async function initGame() {
      try {
        setIsLoading(true);
        // 1. Get available maps
        const mapsRes = await fetch(`${API_BASE}/maps`);
        const maps = await mapsRes.json();
        if (!maps || maps.length === 0) return;

        // 2. Fetch selected map details with characters
        const currentMapId = maps[0].id;
        const mapDetailRes = await fetch(`${API_BASE}/maps/${currentMapId}`);
        const mapData = await mapDetailRes.json();
        setMap(mapData);

        // 3. Start a game session on the server
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

  return (
    <div className="app-container">
      {map && (
        <Header
          characters={map.characters || []}
          foundCharacters={foundCharacters}
          isGameActive={isGameActive}
        />
      )}

      <main className="game-main">
        {isLoading ? (
          <div className="loading-spinner">Loading game map...</div>
        ) : (
          <GameImage map={map} />
        )}
      </main>
    </div>
  );
}

export default App;
