# WOW/GSI Shared Rules

Apply these rules to WOW/GSI projects unless the user explicitly says otherwise.

## Git Flow

- `main`: production branch, bound to the formal/production environment.
- `develop`: testing branch, bound to the test environment.
- Main feature branches use `feat/{main-feature-summary}` and are opened from `main`.
- Feature child branches use `feat/{main-feature-summary}/{sub-feature-summary}` when multiple people work under one parent feature; merge them back into the parent feature branch and remove the child branch when complete.
- Bug fix branches use `fix/{bug-summary}`.
- For production bugs, open the fix branch from `main`; for in-progress feature bugs, open from the active feature branch and merge back to that parent feature branch.
- Optimization branches use `perf/{optimization-summary}`.
- Refactor branches use `refactor/{refactor-summary}`.
- Other work uses `chore/{other-work-summary}`.
- After development, merge the work branch into `develop` and verify through the test environment.
- Create the production MR to `main` only when the tested change needs to go online.
- Do not rebase by default. If a production MR to `main` has conflicts, merge `main` into the work branch, resolve conflicts there, then create or update the MR.

## ESLint

- Do not proactively fix ESLint issues if they do not prevent the app from running, building, or passing required verification.
- Only fix non-blocking ESLint issues when the user explicitly asks for lint cleanup or asks to fix those specific issues.

## Scope Control

- Only implement the requested requirement.
- Do not optimize unrelated screens, styles, layouts, micro-interactions, transitions, or animations unless the user explicitly asks for those changes.
- Keep visual and motion changes limited to what is necessary for the requirement.

## Merge Requests

- Do not proactively create or open Merge Requests or Pull Requests.
- Do not use `glab` or `gh` to create MRs/PRs unless the user explicitly asks.
- After pushing, share the GitLab/GitHub returned MR/PR link with the user and let the user decide whether to open it.
