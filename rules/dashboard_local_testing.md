# Dashboard Local Test Login

- This rule applies only when Codex opens or verifies the agent-side Dashboard through a local application origin such as `localhost` or `127.0.0.1`.
- When local authentication or agent selection is required, read `.codex/local-test-login.json` only at the moment the values are needed. Use its `username`, `password`, and `agentCode` exactly; do not guess or substitute remembered values while the file is available.
- Never print, echo, summarize, screenshot, log, or place those values in commentary, final responses, shell commands, patches, test snapshots, tracked files, commits, or remote messages.
- Do not use these credentials on a remote UI origin or for member-side testing unless the user explicitly expands the scope.
- If the file is missing, unreadable, malformed, or the login fails, report the condition without revealing any value. Do not change credentials, agent code, or environment configuration automatically.
