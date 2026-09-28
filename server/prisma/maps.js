// Percentages measured against these exact images and visually checked.
// Use a small tolerance around each visible character, excluding neighbors.
export const maps = [
  {
    name: "Waldo at the Beach",
    imageUrl: "/images/waldo-beach.jpg",
    characters: [
      { name: "Waldo", avatarUrl: "/images/waldo.svg", xMin: 51.3, xMax: 53.8, yMin: 45.95, yMax: 51.05 },
      { name: "Wizard Whitebeard", avatarUrl: "/images/wizard.svg", xMin: 60.88, xMax: 63.34, yMin: 45.71, yMax: 52.99 },
      { name: "Odlaw", avatarUrl: "/images/odlaw.svg", xMin: 22.7, xMax: 25.54, yMin: 46.23, yMax: 52.85 },
    ],
  },
  {
    name: "The Gobbling Gluttons",
    imageUrl: "/images/waldo-gluttons.jpg",
    characters: [
      { name: "Waldo", avatarUrl: "/images/waldo.svg", xMin: 56.15, xMax: 57.74, yMin: 33.45, yMax: 36.7 },
      { name: "Wizard Whitebeard", avatarUrl: "/images/wizard.svg", xMin: 83.65, xMax: 87.05, yMin: 82.3, yMax: 88.35 },
      { name: "Odlaw", avatarUrl: "/images/odlaw.svg", xMin: 39.18, xMax: 41.1, yMin: 58.3, yMax: 62.0 },
    ],
  },
  {
    name: "The Nasty Nasties",
    imageUrl: "/images/waldo-nasties.jpg",
    characters: [
      { name: "Waldo", avatarUrl: "/images/waldo.svg", xMin: 94.71, xMax: 96.81, yMin: 3.5, yMax: 6.64 },
      { name: "Wizard Whitebeard", avatarUrl: "/images/wizard.svg", xMin: 27.97, xMax: 30.86, yMin: 37.55, yMax: 43.68 },
      { name: "Odlaw", avatarUrl: "/images/odlaw.svg", xMin: 90.72, xMax: 92.82, yMin: 55.07, yMax: 59.95 },
    ],
  },
];
