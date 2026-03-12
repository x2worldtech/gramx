import { useEffect, useState } from "react";
import type { Chat } from "./backend.d";
import AuthScreen from "./components/AuthScreen";
import ChatListScreen from "./components/ChatListScreen";
import ChatScreen from "./components/ChatScreen";
import GroupJoinScreen from "./components/GroupJoinScreen";
import RegistrationScreen from "./components/RegistrationScreen";
import SettingsScreen from "./components/SettingsScreen";
import { SettingsProvider, useSettingsSync } from "./contexts/SettingsContext";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useMyUser } from "./hooks/useQueries";

export type AppView = "list" | "chat" | "settings";

function AppInner() {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const { actor } = useActor();
  const { data: myUser, isFetched: userFetched } = useMyUser();
  const [activeView, setActiveView] = useState<AppView>("list");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Detect invite token in URL
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(
    () => {
      const params = new URLSearchParams(window.location.search);
      return params.get("joinGroup");
    },
  );

  // Sync displayName from myUser into settings context
  useSettingsSync(myUser?.name);

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    setActiveView("chat");
  };

  const closeChat = () => {
    setActiveView("list");
    setActiveChat(null);
  };

  const openSettings = () => {
    setActiveView("settings");
  };

  const closeSettings = () => {
    setActiveView("list");
  };

  const handleAccountDeleted = () => {
    clear();
  };

  const handleLogout = () => {
    clear();
  };

  const handleJoinGroup = (chat: Chat) => {
    // Clear invite token from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("joinGroup");
    window.history.replaceState({}, "", url.toString());
    setPendingInviteToken(null);
    openChat(chat);
  };

  const handleDismissJoin = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("joinGroup");
    window.history.replaceState({}, "", url.toString());
    setPendingInviteToken(null);
  };

  // Only block during the initial local-storage read (< 300ms)
  if (isInitializing) {
    return (
      <div className="app-shell">
        <SplashLogo />
      </div>
    );
  }

  // No identity → show login screen
  if (!identity) {
    return (
      <div className="app-shell">
        <AuthScreen />
      </div>
    );
  }

  // Identity exists but user is definitively NOT registered → show registration
  // Only show when actor is ready AND the query has completed with null result
  if (actor && userFetched && myUser === null) {
    return (
      <div className="app-shell">
        <RegistrationScreen />
      </div>
    );
  }

  // Identity exists → show main app immediately regardless of backend state
  return (
    <div className="app-shell">
      {/* Chat List */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          transform:
            activeView === "list" ? "translateX(0)" : "translateX(-30%)",
          opacity: activeView === "list" ? 1 : 0,
          transition:
            "transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.28s ease",
          pointerEvents: activeView === "list" ? "auto" : "none",
        }}
      >
        <ChatListScreen
          myUser={myUser ?? null}
          onOpenChat={openChat}
          onOpenSettings={openSettings}
        />
      </div>

      {/* Chat Screen */}
      {activeChat && (
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            transform:
              activeView === "chat" ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.28s cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          <ChatScreen
            chat={activeChat}
            myUser={myUser ?? null}
            onBack={closeChat}
          />
        </div>
      )}

      {/* Settings Screen */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          transform:
            activeView === "settings" ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.32,0.72,0,1)",
          pointerEvents: activeView === "settings" ? "auto" : "none",
        }}
      >
        <SettingsScreen
          myUser={myUser ?? null}
          onBack={closeSettings}
          onAccountDeleted={handleAccountDeleted}
          onLogout={handleLogout}
        />
      </div>

      {/* Group Join Overlay */}
      {pendingInviteToken && (
        <div className="absolute inset-0 z-40">
          <GroupJoinScreen
            token={pendingInviteToken}
            myUser={myUser ?? null}
            onJoined={handleJoinGroup}
            onDismiss={handleDismissJoin}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppInner />
    </SettingsProvider>
  );
}

function SplashLogo() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background">
      <div className="relative w-10 h-10">
        <svg
          className="w-10 h-10 animate-spin"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Loading"
        >
          <circle cx="20" cy="20" r="16" stroke="#1e293b" strokeWidth="3.5" />
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="url(#spinner-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="60 41"
          />
          <defs>
            <linearGradient
              id="spinner-gradient"
              x1="0"
              y1="0"
              x2="40"
              y2="40"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
