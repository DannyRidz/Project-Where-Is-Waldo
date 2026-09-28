import { useState, useEffect, useRef } from "react";
import TargetingBox from "./TargetingBox";
import FoundMarker from "./FoundMarker";

function GameImage({
  map,
  foundCharacters,
  foundMarkers,
  onSelectCharacter,
  onImageReady,
  isGameActive,
}) {
  const [targetingPosition, setTargetingPosition] = useState(null);
  const [imageError, setImageError] = useState(false);

  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!targetingPosition) return;

    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setTargetingPosition(null);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    const handleEscape = (event) => {
      if (event.key === "Escape") setTargetingPosition(null);
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [targetingPosition]);

  if (!map) return <div className="loading-state">Loading map...</div>;

  const handleImageClick = (e) => {
    if (!isGameActive || imageError) return;
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
      dropdownOffset: Math.max(85 - clickX, Math.min(0, rect.width - 85 - clickX)),
    });
  };

  const handleCharacterSelect = (characterId) => {
    if (!targetingPosition) return;
    onSelectCharacter(characterId, targetingPosition);
    setTargetingPosition(null);
  };

  return (
    <div className="image-viewport">
      <div ref={wrapperRef} className="image-wrapper" onClick={handleImageClick}>
        {imageError ? (
          <div className="image-error" role="alert">
            The map image could not be loaded. Refresh the page and try again.
          </div>
        ) : (
          <img
            src={map.imageUrl}
            alt={map.name}
            className="waldo-image"
            draggable={false}
            onLoad={onImageReady}
            onError={() => setImageError(true)}
          />
        )}

        {/* Interactive Targeting Box */}
        {isGameActive && <TargetingBox
          position={targetingPosition}
          characters={map.characters || []}
          foundCharacters={foundCharacters}
          onSelectCharacter={handleCharacterSelect}
        />}

        {/* Permanent Found Markers */}
        {foundMarkers.map((marker) => (
          <FoundMarker key={marker.id} character={marker} />
        ))}
      </div>
    </div>
  );
}

export default GameImage;
