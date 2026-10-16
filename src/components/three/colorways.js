/** Watch colourways shared by the 3D scene and the static SVG poster (no three.js import here). */
export const COLORWAYS = {
  steel: {
    label: "Steel",
    caseColor: "#d4d6da",
    caseRoughness: 0.22,
    dialColor: "#0d3236",
    dialAccent: "#e6cf9f",
    handColor: "#f1ede4",
    strapColor: "#17120f",
    caseLabel: "316L STEEL CASE",
    swatch: "linear-gradient(135deg,#f4f5f7,#8d9096)",
  },
  gold: {
    label: "Gold",
    caseColor: "#d9b876",
    caseRoughness: 0.2,
    dialColor: "#0b0b0c",
    dialAccent: "#e6cf9f",
    handColor: "#f0d9a6",
    strapColor: "#2a170e",
    caseLabel: "18K GOLD PVD CASE",
    swatch: "linear-gradient(135deg,#fff1cc,#a8864c)",
  },
  noir: {
    label: "Noir",
    caseColor: "#2b2b30",
    caseRoughness: 0.34,
    dialColor: "#d8c9a6",
    dialAccent: "#1a1a1c",
    handColor: "#1a1a1c",
    strapColor: "#0c0c0d",
    caseLabel: "DLC BLACK CASE",
    swatch: "linear-gradient(135deg,#4a4a52,#0d0d0f)",
  },
};

export const COLORWAY_KEYS = Object.keys(COLORWAYS);
