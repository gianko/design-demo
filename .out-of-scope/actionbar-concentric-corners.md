# Concentric corners on ActionBar

ActionBar is a surface with the density's surface radius (8px admin, 12px contractor) and one 8px step of padding around its Buttons, which have the control radius (6px). Concentric corners (inner = outer − padding) would need 2px or 6px of padding, or an outer radius of 14px. The bar's corners aren't concentric: the arcs' centres are 6px apart at admin and 2px apart at contractor.

## Why this is out of scope

The design brief's radius table and its concentric rule can't both hold here on the spacing scale, and the table wins. Neither padding is a spacing step, and a dedicated radius breaks something else. A 10px radius with 4px padding is concentric at both densities, but drops the surface radius's split between densities. A 14px radius makes the bar rounder than every surface around it, against "subtle, never a pill".

All three were compared side by side under invoice-queue's table, at both densities in both themes, and today's corners were chosen by eye. The prototype is kept on the `prototype/239-actionbar-corners` branch. The design brief now says nested corners stay concentric "where the spacing scale allows".

## When to reconsider

When a nested surface's padding is a spacing step that makes the corners concentric, or when a second raised component (Toast, Sheet's close button) shows the same mismatch and a radius role for raised things would serve all of them.

## Prior requests

- #239: "ActionBar gap: Nested corners can't be concentric with the tokens"
