---
name: Auth & Cloud Notes System
description: User authentication via Supabase Auth, extension OAuth flow, cloud notes persistence, profiles table
type: feature
---
- Auth pages: /auth (website login/signup), /auth/extension (extension OAuth callback)
- AuthContext wraps entire app, provides user/session/profile
- Extension auth: user clicks login icon → opens website /auth/extension?ext={extensionId} → logs in → token sent back via chrome.runtime.sendMessage (externally_connectable)
- Token stored in chrome.storage.local: authToken, authRefreshToken, authDisplayName, authEmail, authUserId
- Sidepanel shows "Hey, [firstName]" when authenticated
- Cloud notes: save-note edge function (save/list/get/delete actions), requires Bearer token
- Notes saved to cloud automatically after conversion if user is authenticated
- Database: profiles table (auto-created on signup via trigger), notes table (user-scoped RLS)
- Payments NOT yet implemented — India doesn't support Stripe, alternative TBD
