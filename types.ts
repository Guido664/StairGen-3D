export interface Landing {
  id: string; // unique identifier for UI list
  stepIndex: number; // 1-based step index
  depth: number; // cm
}

export interface StairConfig {
  totalHeight: number; // cm
  width: number; // cm
  numSteps: number;
  stepDepth: number; // cm
  slabThickness: number; // cm
  landings: Landing[]; // Array of landings
}