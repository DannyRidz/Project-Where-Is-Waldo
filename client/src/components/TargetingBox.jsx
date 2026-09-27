function TargetingBox({
  position,
  characters,
  foundCharacters,
  onSelectCharacter,
}) {
  if (!position) return null;

  // Filter out characters that have already been discovered
  const remainingCharacters = characters.filter(
    (char) => !foundCharacters.includes(char.id),
  );

  return (
    <div
      className="targeting-container"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the box
    >
      {/* Visual Targeting Reticle / Crosshair */}
      <div className="targeting-box">
        <div className="crosshair-center"></div>
      </div>

      {/* Dropdown Menu of remaining characters */}
      <div className="targeting-dropdown">
        <div className="dropdown-title">Who is this?</div>
        {remainingCharacters.map((char) => (
          <button
            key={char.id}
            type="button"
            className="dropdown-item"
            onClick={() => onSelectCharacter(char.id)}
          >
            <img
              src={char.avatarUrl}
              alt={char.name}
              className="dropdown-avatar"
            />
            <span>{char.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TargetingBox;
