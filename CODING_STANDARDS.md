# Coding standards

Judgement calls for the reviewer. Anything a linter, type or test can catch belongs in that check, not here.

## Token build

- **A validation covers everything its source rule names.** Scope a check by the wording of the brief, ADR or `lint/taste/RULES.md` line it enforces, not by where the current tokens happen to put the value. "Every neutral is tinted" means every written colour, including a literal in a theme file or a shadow layer, not only `primitive.neutral.*`.

## Tests

- **A failing fixture plants the least obvious case the check applies to.** A fixture is evidence of a check's scope, so put the violation where a narrow check would miss it, not only in the first place anyone would look: a literal shadow colour or a density-mode token for a token validation, two duplicate registry names that sit apart in the input.
