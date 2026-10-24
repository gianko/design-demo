// The screen state every screen starts in, declared or not: the UI spec, its
// stories and the library's ScreenHost all name it so (ADR 0004, ADR 0011).
// Its own module, so the generator reads it without loading React.
export const defaultState = "default";
