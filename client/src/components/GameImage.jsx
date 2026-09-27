function GameImage({ map, children }) {
  if (!map) return <div className="loading-state">Loading map...</div>;

  return (
    <div className="image-viewport">
      <div className="image-wrapper">
        <img
          src={map.imageUrl}
          alt={map.name}
          className="waldo-image"
          draggable={false}
        />
        {/* Child elements (Targeting Box and Markers) will be rendered here in Steps 6 & 7 */}
        {children}
      </div>
    </div>
  );
}

export default GameImage;
