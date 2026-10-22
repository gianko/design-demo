// The theme and density globals every story renders under (ADR 0002).
export const themes = ["light", "dark"] as const;
export const densities = ["admin", "contractor"] as const;

export type Theme = (typeof themes)[number];
export type Density = (typeof densities)[number];
export const broken: number = "x";
