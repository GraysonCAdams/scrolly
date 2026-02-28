Break up our uncommitted changes into smaller, descriptive commits, addressing any pre-commit hook issues as you go.

Rules:
- Each commit should be one logical change (one feature, one fix, one refactor)
- Use conventional commit prefixes: feat:, fix:, refactor:, chore:, docs:, style:
- Imperative mood, lowercase, no period
- Never bundle unrelated changes
- If pre-commit hooks fail, fix the issue and create a NEW commit (don't amend)
