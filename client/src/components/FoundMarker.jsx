function FoundMarker({ character }) {
  return (
    <div
      className="found-marker"
      style={{
        left: `${(character.xMin + character.xMax) / 2}%`,
        top: `${(character.yMin + character.yMax) / 2}%`,
      }}
      title={`✓ ${character.name} found!`}
    >
      <span className="found-marker-checkmark">✓</span>
      <span className="found-marker-label">{character.name}</span>
    </div>
  );
}

export default FoundMarker;
