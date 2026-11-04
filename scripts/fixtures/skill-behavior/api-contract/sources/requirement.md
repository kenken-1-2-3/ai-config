# Delivery settings requirement — fixture revision 2026-11-04

## Required setting

The agent administration delivery settings form must let the operator choose `email` or `sms`, and save the selected delivery mode. The required persistence field is `delivery_mode`. This complete requirement is REQ-001. Keep the control available and editable. If saving fails, preserve the input and explain which value was not saved and why. Do not add default selection, placeholder, hint, sorting, or validation requirements.

No UI-only fallback, exclusion, implementation handoff, or feature completion has been approved. A missing required API field is a contract blocker; the backend contract owner must supply the request/response mapping before integration can proceed. Independent source/spec review may continue.
