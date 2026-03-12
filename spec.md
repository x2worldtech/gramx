# GramX

## Current State
App is a full Telegram-style chat app. `useMyUser` hook calls `getCallerUserProfile()` which returns `UserProfile | null` (without `principal`). Chats are not loading and new chats don't persist in the list.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `useMyUser`: Switch from `getCallerUserProfile()` to `getMyUser()` which returns the full `User` object (with `principal`). Handle `Unauthorized`/`not registered` errors as null (user not registered). Propagate other errors so React Query retries.
- `useCreateDirectChat` / `useCreateGroupChat`: Optimistically add new chat to the `myChats` cache immediately on success, so the chat list updates instantly without waiting for the next poll.
- `useMyChats`: Scope the query key to include `principalId` to avoid stale data across users.

### Remove
- Nothing

## Implementation Plan
1. Fix `useMyUser` to call `getMyUser()` and handle errors correctly
2. Fix `useCreateDirectChat` and `useCreateGroupChat` to update cache immediately on success
3. Validate and deploy
