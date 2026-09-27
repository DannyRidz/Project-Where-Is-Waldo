import Timer from "./Timer";

function Header({ characters, foundCharacters, isGameActive }) {
  return (
    <header className="game-header">
      <div className="header-left">
        <h1 className="game-title">Where's Waldo?</h1>
      </div>

      <div className="character-targets">
        {characters.map((char) => {
          const isFound = foundCharacters.includes(char.id);
          return (
            <div
              key={char.id}
              className={`target-pill ${isFound ? "found" : ""}`}
              title={isFound ? `${char.name} (Found!)` : `Find ${char.name}`}
            >
              <img
                src={char.avatarUrl}
                alt={char.name}
                className="target-avatar"
              />
              <span className="target-name">{char.name}</span>
              {isFound && <span className="checkmark">✓</span>}
            </div>
          );
        })}
      </div>

      <div className="header-right">
        <Timer isRunning={isGameActive} />
      </div>
    </header>
  );
}

export default Header;
