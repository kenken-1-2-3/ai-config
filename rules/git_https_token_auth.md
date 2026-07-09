# WOW Git HTTPS Token Authentication

Apply these rules to managed WOW project repos that use `https://gltw.6633663.com/web_frontend/...` remotes. `ai-config` is excluded because it uses GitHub.

- Use HTTPS + Personal Access Token authentication for Git.
- Keep `origin` on the existing `https://gltw.6633663.com/web_frontend/...` URL, preserving the repo's current `.git` suffix style.
- Do not switch a repo to SSH unless the user explicitly asks.
- Never embed a username, password, or token in the Git remote URL, command output, docs, or committed config.
- Use macOS Keychain via `credential.helper=osxkeychain`, and keep credentials path-scoped with `git config --local credential.https://gltw.6633663.com.useHttpPath true`.
- Before `git pull` or `git fetch`, prefer a non-interactive auth probe: `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD`.
- If HTTPS auth fails, stop and report that the token or Keychain credential needs refresh. Do not automatically try SSH fallback, and do not treat a cached `origin/main` as proof that the remote was freshly reachable.
