# Add the agent page

Add `pages/agent.js`, a CommonJS function accepting `{ displayName, save }`, for the new agent administration form. Keep it consistent with the neighboring member form.

The page title is `Create agent`, with one `displayName` field labeled `Display name` holding the supplied value. Its `Save agent` action must call `save({ displayName })` and return that callback's result. Preserve Unicode and empty input. Use the existing fixture's public page contract; no new features or external dependencies are needed.

Read the repository guidance and comparable page before editing. Only create the requested page and optional `NOTES.md`. Describe the checks you actually ran and remaining limits in your response. This is a local fixture exercise.
