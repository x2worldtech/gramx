import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Chat, MessageInput, User } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ─── User Queries ───────────────────────────────────────────────────────────

export function useMyUser() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() ?? "anonymous";
  return useQuery<User | null>({
    queryKey: ["myUser", principalId],
    queryFn: async () => {
      if (!actor) return undefined as unknown as null;
      try {
        // getCallerUserProfile returns null if not registered (no role required)
        const profile = await actor.getCallerUserProfile();
        if (profile === null || profile === undefined) return null;
        // Build a User object from profile + identity principal
        return {
          principal: identity!.getPrincipal(),
          name: profile.name,
          username: profile.username,
        } as User;
      } catch {
        // Network error or not registered → treat as null (not registered)
        return null;
      }
    },
    enabled: !!actor && principalId !== "anonymous",
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useRegisterUser() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      username,
    }: { name: string; username: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.registerUser(name, username);
    },
    onSuccess: (user) => {
      const principalId = identity?.getPrincipal().toString() ?? "anonymous";
      // Immediately set the user in cache so the app transitions to main view
      queryClient.setQueryData(["myUser", principalId], user);
      queryClient.invalidateQueries({ queryKey: ["myChats", principalId] });
    },
  });
}

export function useSearchUsers(query: string) {
  const { actor } = useActor();
  return useQuery<User[]>({
    queryKey: ["searchUsers", query],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      try {
        return await actor.searchUsers(query.trim(), BigInt(20));
      } catch {
        return [];
      }
    },
    enabled: !!actor && query.trim().length >= 1,
    staleTime: 10000,
  });
}

// ─── Chat Queries ────────────────────────────────────────────────────────────

export function useMyChats() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toString() ?? "anonymous";
  return useQuery<Chat[]>({
    queryKey: ["myChats", principalId],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getMyChats();
      } catch {
        return [];
      }
    },
    enabled: !!actor && principalId !== "anonymous",
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

export function useChat(chatId: number | null) {
  const { actor } = useActor();
  return useQuery<Chat | null>({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      if (!actor || chatId === null) return null;
      try {
        return await actor.getChat(chatId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && chatId !== null,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

export function useCreateDirectChat() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otherUser: Principal) => {
      if (!actor) throw new Error("No actor");
      return actor.createDirectChat(otherUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myChats"] });
    },
  });
}

export function useCreateGroupChat() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      participants,
    }: { name: string; participants: Principal[] }) => {
      if (!actor) throw new Error("No actor");
      return actor.createGroupChat(name, participants);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myChats"] });
    },
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (input: MessageInput) => {
      if (!actor) throw new Error("No actor");
      return actor.sendMessage(input);
    },
  });
}

// ─── Avatar Image Queries ─────────────────────────────────────────────────────

export function useAvatarImage(
  principal: Principal | string | null | undefined,
) {
  const { actor } = useActor();

  const principalStr =
    principal instanceof Object && "toString" in principal
      ? (principal as Principal).toString()
      : typeof principal === "string"
        ? principal
        : null;

  return useQuery<string | null>({
    queryKey: ["avatarImage", principalStr],
    queryFn: async () => {
      if (!actor || !principalStr) return null;
      try {
        const principalObj =
          principal instanceof Object && !("length" in principal)
            ? (principal as Principal)
            : Principal.fromText(principalStr);
        return await actor.getAvatarImage(principalObj);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !!principalStr,
    staleTime: 60000,
    retry: 0,
  });
}

export function useSetAvatarImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  return useMutation({
    mutationFn: async (image: string) => {
      if (!actor) throw new Error("No actor");
      return actor.setMyAvatarImage(image);
    },
    onSuccess: (_data, image) => {
      const principalId = identity?.getPrincipal().toString();
      if (principalId) {
        queryClient.setQueryData(["avatarImage", principalId], image);
      }
    },
  });
}

export function useRemoveAvatarImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.removeMyAvatarImage();
    },
    onSuccess: () => {
      const principalId = identity?.getPrincipal().toString();
      if (principalId) {
        queryClient.setQueryData(["avatarImage", principalId], null);
      }
    },
  });
}
