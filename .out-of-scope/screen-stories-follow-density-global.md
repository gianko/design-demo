# Screen stories that follow the density toolbar

Screen has one story per `audience` value, and each story pins its density through `audience`. No story's `audience` follows Storybook's `density` global.

## Why this is out of scope

Screen sets its own `data-density` from `audience`, and the inner scope wins over the density global around it. So the Admin story renders the same under both globals, and so does Contractor: two of each story's four shots match. That matching pair is the evidence that a Screen's audience overrides the density around it, which a story that followed the global would never show. It costs four small PNGs.

## Prior requests

- #90: "Screen gap: Stories pin density through `audience`, not the toolbar"
