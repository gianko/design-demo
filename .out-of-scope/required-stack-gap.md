# A required gap on Stack

Stack's `gap` is optional and defaults to `sm` (16px). It isn't required, and it doesn't default by direction.

## Why this is out of scope

The registry's `gap` description names `sm` as the default, so the spec step knows what a Stack without `gap` gets. Making `gap` required would add a prop to every Stack in every UI spec, and give the model one more way to fail validation, without changing what most screens render.

## Prior requests

- #109: "Stack gap: Stack's default gap is a guess"
