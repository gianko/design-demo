# Coding standards

Judgement calls for the reviewer. Anything a linter, type or test can catch belongs in that check, not here.

## Token build

- **A validation covers everything its source rule names.** Scope a check by the wording of the brief, ADR or `lint/taste/RULES.md` line it enforces, not by where the current tokens happen to put the value. "Every neutral is tinted" means every written colour, including a literal in a theme file or a shadow layer, not only `primitive.neutral.*`.
- **A failing fixture plants the least obvious case the rule applies to.** The fixture for a rule is evidence of its scope, so put the violation where a narrow check would miss it (a literal shadow colour, a density-mode token), not only in the first place anyone would look.
