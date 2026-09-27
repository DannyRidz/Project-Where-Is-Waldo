import { useState } from "react";
import TargetingBox from "./TargetingBox";
import FoundMarker from "./FoundMarker";

function GameImage({ map, foundCharacters, foundMarkers, onSelectCharacter }) {
  const [targetingPosition, setTargetingPosition] = useState(null);

  if (!map) return <div className="loading-state">Loading map...</div>;

  const handleImageClick = (e) => {
    if (targetingPosition) {
      setTargetingPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normalizedX = (clickX / rect.width) * 100;
    const normalizedY = (clickY / rect.height) * 100;

    setTargetingPosition({
      x: parseFloat(normalizedX.toFixed(2)),
      y: parseFloat(normalizedY.toFixed(2)),
    });
  };

  const handleCharacterSelect = (characterId) => {
    if (!targetingPosition) return;
    onSelectCharacter(characterId, targetingPosition);
    setTargetingPosition(null);
  };

  return (
    <div className="image-viewport">
      <div className="image-wrapper" onClick={handleImageClick}>
        <img
          src={map.imageUrl}
          alt={map.name}
          className="waldo-image"
          draggable={false}
        />

        {/* Interactive Targeting Box */}
        <TargetingBox
          position={targetingPosition}
          characters={map.characters || []}
          foundCharacters={foundCharacters}
          onSelectCharacter={handleCharacterSelect}
        />

        {/* Permanent Found Markers */}
        {foundMarkers.map((marker) => (
          <FoundMarker key={marker.id} character={marker} />
        ))}
      </div>
    </div>
  );
}

export default GameImage;
