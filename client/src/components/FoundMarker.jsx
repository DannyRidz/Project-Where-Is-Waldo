function FoundMarker({ character }) {
  const centerX = (character.xMin + character.xMax) / 2;
  return (
    <div
      className="found-marker"
      style={{
        left: `${centerX}%`,
        top: `${(character.yMin + character.yMax) / 2}%`,
      }}
      title={`✓ ${character.name} found!`}
    >
      <span className="found-marker-checkmark">✓</span>
      <span className="found-marker-label" style={{ transform: centerX > 90 ? "translateX(-25%)" : centerX < 10 ? "translateX(25%)" : undefined }}>{character.name}</span>
    </div>
  );
}

export default FoundMarker;
