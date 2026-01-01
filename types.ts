export interface StairConfig {
  totalHeight: number; // cm
  width: number; // cm
  numSteps: number;
  stepDepth: number; // cm
  slabThickness: number; // cm (New field for concrete waist)
  landingStep: number; // 0 = none, otherwise the step number (1-based) that acts as landing
  landingDepth: number; // cm
}