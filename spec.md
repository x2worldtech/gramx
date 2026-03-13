# GramX

## Current State
Das Backend `deleteAccount()` entfernt nur den User aus der `users`-Map und sein Profilbild aus `avatarImages`. Chats bleiben erhalten. Das Frontend löscht beim Account-Löschen keine localStorage-Daten (Kontakte, Gruppeninfos, Settings).

## Requested Changes (Diff)

### Add
- Backend: `deleteAccount` entfernt alle Direct-Chats, an denen der Nutzer beteiligt ist, vollständig
- Backend: `deleteAccount` entfernt den Nutzer aus allen Gruppen-Chats (Participant entfernen)
- Frontend: Nach `deleteAccount` wird `localStorage.clear()` aufgerufen, damit alle Kontakte, Gruppeninfos und Settings gelöscht werden

### Modify
- `src/backend/main.mo`: `deleteAccount`-Funktion erweitern
- `src/frontend/src/components/SettingsScreen.tsx`: `handleDeleteAccount` um localStorage-Clearing erweitern

### Remove
- Nichts

## Implementation Plan
1. Backend `deleteAccount` iteriert über alle Chats: Direct Chats mit Caller werden gelöscht, Gruppen-Chats entfernen den Caller aus der Participants-Liste
2. Frontend `handleDeleteAccount` ruft nach dem Backend-Call `localStorage.clear()` auf
