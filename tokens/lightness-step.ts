// The least OKLCH lightness step a hover or pressed fill makes from what's
// under it, so the state reads on every surface in both themes (#250). A
// step of 0.01 was invisible in the contact sheet (#133), which then held
// light mode's hover 0.03 off page and surface and pressed 0.03 off hover,
// so this is 0.03. The token build checks the roles against it, and stories
// hold their controls' hover to it (ADR 0012).
export const minLightnessStep = 0.03;
