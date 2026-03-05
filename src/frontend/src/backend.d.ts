import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Chat {
    id: ChatId;
    participants: Array<User>;
    messages: Array<Message>;
    name: string;
    createdAt: Time;
    createdBy: User;
    lastMessage?: Message;
    chatType: ChatType;
}
export type Time = bigint;
export type ChatId = number;
export type MessageId = number;
export interface User {
    principal: Principal;
    username: string;
    name: string;
}
export interface Message {
    id: MessageId;
    content: string;
    sender: User;
    timestamp: Time;
}
export interface MessageInput {
    content: string;
    chatId: ChatId;
}
export interface UserProfile {
    username: string;
    name: string;
}
export enum ChatType {
    group = "group",
    direct = "direct"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDirectChat(otherUser: Principal): Promise<Chat>;
    createGroupChat(name: string, participants: Array<Principal>): Promise<Chat>;
    deleteAccount(): Promise<void>;
    getAvatarImage(user: Principal): Promise<string | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChat(chatId: ChatId): Promise<Chat>;
    getMyChats(): Promise<Array<Chat>>;
    getMyUser(): Promise<User>;
    getUser(user: Principal): Promise<User>;
    getUserByUsername(username: string): Promise<User>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    registerUser(name: string, username: string): Promise<User>;
    removeMyAvatarImage(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsers(searchTerm: string, limit: bigint): Promise<Array<User>>;
    sendMessage(messageInput: MessageInput): Promise<Message>;
    setMyAvatarImage(image: string): Promise<void>;
}
