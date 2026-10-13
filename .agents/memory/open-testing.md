---
name: Temporary open testing
description: User-requested temporary access and the distinction between role preview and authorization.
---
The user requested temporary public access behind an opt-in flag, preserving all normal auth/role code. Every visitor is Test Admin. “View as” changes the session's visible role, while API requests remain unrestricted in open mode.

**Why:** The user wants to explore every role's screens without separate accounts or permission errors.

**How to apply:** Never treat preview roles as security enforcement or persist actual admin privileges on the test identity. Turning the flag off must ignore preview cookies and restore normal authentication. Keep the confidentiality warning visible. Open mode is not a permanent product requirement.
