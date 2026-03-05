import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import type { Chat } from "./backend.d";
import AuthScreen from "./components/AuthScreen";
import ChatListScreen from "./components/ChatListScreen";
import ChatScreen from "./components/ChatScreen";
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
        <Toaster position="top-center" />
        <AuthScreen />
      </div>
    );
  }

  // Identity exists but user is definitively NOT registered → show registration
  // Only show when actor is ready AND the query has completed with null result
  if (actor && userFetched && myUser === null) {
    return (
      <div className="app-shell">
        <Toaster position="top-center" />
        <RegistrationScreen />
      </div>
    );
  }

  // Identity exists → show main app immediately regardless of backend state
  // Backend data (chats, profile) loads in background via React Query
  return (
    <div className="app-shell">
      <Toaster position="top-center" />

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
        />
      </div>
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
      <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-ios">
        <img
          src="/assets/generated/gramx-logo-transparent.dim_200x200.png"
          alt="GramX Logo"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
