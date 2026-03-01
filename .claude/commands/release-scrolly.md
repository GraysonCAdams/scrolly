Take all uncommitted and committed changes on the current branch and drive them through the full release pipeline until a new Docker image is published. Follow every step below in order.

## 1. Commit & Push Changes

- Run `git status` and `git diff` to see what's uncommitted
- Break uncommitted changes into small, focused conventional commits (feat:, fix:, refactor:, chore:, etc.)
- If pre-commit hooks fail, fix the issue and create a NEW commit (never amend)
- If already on main, create a feature branch first (`git checkout -b <descriptive-branch-name>`)
- Push the branch to origin

## 2. Create a PR

- Use `gh pr create` targeting main
- Title should summarize the changes concisely (under 70 chars)
- Body should have a ## Summary with bullet points and a ## Test plan
- If a PR already exists for this branch, skip creation

## 3. Pass CI Checks

- Watch PR checks with `gh pr checks <number> --watch`
- If any check fails, read the failure logs, fix the issue, commit the fix, and push
- Repeat until ALL checks pass (lint, format, type-check, tests, build, CodeQL)
- Run `npm run check` and `npm run lint` locally before pushing fixes to save time

## 4. Merge the PR

- Once all checks are green, merge with `gh pr merge <number> --squash --delete-branch`
- If merge is blocked, investigate why (reviews required, checks pending) and address it
- Confirm merge succeeded

## 5. Wait for Release-Please PR

- After merge to main, the Release workflow runs and release-please creates/updates a release PR
- Poll with `gh pr list --label "autorelease: pending"` until the release PR appears
- Note the release PR number

## 6. Wait for Release PR Checks

- The release PR gets CI checks via release-pr-checks.yml (triggered by close/reopen)
- Watch with `gh pr checks <release-pr-number> --watch`
- If checks fail, you may need to push fixes to main and wait for release-please to update the PR

## 7. Merge the Release PR

- Once checks pass: `gh pr merge <release-pr-number> --squash --delete-branch`
- This triggers release-please to publish a GitHub release with version tag

## 8. Verify the Release

- Confirm the GitHub release was created: `gh release list --limit 1`
- Note the version number

## 9. Wait for Docker Image

- The docker-publish.yml workflow triggers automatically after the Release workflow completes
- Watch it: `gh run list --workflow=docker-publish.yml --limit 1` and `gh run watch <run-id>`
- If it doesn't trigger within 2 minutes, check if the workflow_run event fired
- As a fallback, manually trigger: `gh workflow run docker-publish.yml -f version=<version>`

## 10. Confirm Docker Image Published

- Verify the image exists: `gh api /orgs/312-dev/packages/container/scrolly/versions --jq '.[0].metadata.container.tags'`
- Confirm both `<version>` and `latest` tags are present
- Report the full image reference: `ghcr.io/312-dev/scrolly:<version>`

## 11. Update Documentation

- Review the changes that were released and check if any docs in `docs/` are now outdated or would benefit from updates
- Key docs to check: `docs/api.md` (new/changed endpoints), `docs/data-model.md` (schema changes), `docs/architecture.md` (structural changes, directory tree, ASCII diagrams), `docs/design-guidelines.md` (UI/component changes), `docs/notifications.md` (notification changes)
- Check any ASCII diagrams, directory trees, or architecture diagrams in the docs for inaccuracies — if files were added/removed/moved or the architecture changed, update the diagrams to match reality
- Only update docs that are **clearly affected** by the changes — don't touch docs that are still accurate
- If docs were updated, commit them as `docs: update <file> for <change>` and push directly to main
- Skip this step entirely if the changes are purely internal (refactors, dep bumps, CI tweaks) with no user-facing or API impact

## Important Notes

- Never force-push to main
- If anything gets stuck, check `gh run list` for workflow status and `gh run view <id> --log-failed` for errors
- The full pipeline (CI + release + Docker build) takes ~15-20 minutes total
- Keep the user informed of progress at each major step
