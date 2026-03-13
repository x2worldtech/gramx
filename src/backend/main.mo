import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Array "mo:core/Array";
import Map "mo:core/Map";
import List "mo:core/List";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Char "mo:core/Char";
import Runtime "mo:core/Runtime";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  stable var currentId = 0;
  stable var usersEntries : [(Principal, User)] = [];
  stable var chatsEntries : [(ChatId, Chat)] = [];
  stable var avatarImagesEntries : [(Principal, Text)] = [];

  var users : Map.Map<Principal, User> = Map.empty<Principal, User>();
  var chats : Map.Map<ChatId, Chat> = Map.empty<ChatId, Chat>();
  var avatarImages : Map.Map<Principal, Text> = Map.empty<Principal, Text>();

  public type User = {
    principal : Principal;
    name : Text;
    username : Text;
  };

  module User {
    public func compare(u1 : User, u2 : User) : Order.Order {
      switch (Text.compare(u1.username, u2.username)) {
        case (#equal) { Text.compare(u1.name, u2.name) };
        case (order) { order };
      };
    };
  };

  public type ChatId = Nat32;
  public type MessageId = Nat32;

  public type ChatType = {
    #direct;
    #group;
  };

  public type Message = {
    id : MessageId;
    sender : User;
    content : Text;
    timestamp : Time.Time;
  };

  public type MessageInput = {
    content : Text;
    chatId : ChatId;
  };

  public type Chat = {
    id : ChatId;
    name : Text;
    messages : [Message];
    participants : [User];
    chatType : ChatType;
    createdBy : User;
    createdAt : Time.Time;
    lastMessage : ?Message;
  };

  public type UserProfile = {
    name : Text;
    username : Text;
  };

  module Helpers {
    public func validateUsername(username : Text) : Bool {
      if (username.size() < 3 or username.size() > 32) {
        return false;
      };

      for (char in username.chars()) {
        let isValid = switch (char.toNat32()) {
          case (c) {
            // a-z
            if (c >= 97 and c <= 122) { true } else {
              // A-Z
              if (c >= 65 and c <= 90) { true } else {
                // 0-9
                c >= 48 and c <= 57;
              };
            };
          };
        };
        if (not isValid) { return false };
      };
      true;
    };
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    users.get(caller).map(
      func(user) {
        {
          name = user.name;
          username = user.username;
        };
      }
    );
  };

  // No auth check needed, anyone can view any profile
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    users.get(user).map(
      func(u) {
        {
          name = u.name;
          username = u.username;
        };
      }
    );
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can save profiles");
    };

    let existingUser = switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?user) { user };
    };

    let validatedUsername = profile.username.toLower();
    if (not Helpers.validateUsername(validatedUsername)) {
      Runtime.trap("Invalid username format");
    };

    let existingUsername = users.values().find(
      func(user) {
        user.principal != caller and Text.equal(user.username, validatedUsername);
      }
    );
    if (existingUsername != null) {
      Runtime.trap("Username is already in use");
    };

    let updatedUser = {
      principal = caller;
      name = profile.name;
      username = validatedUsername;
    };

    users.add(caller, updatedUser);
  };

  public query ({ caller }) func getMyUser() : async User {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can get their profile");
    };
    switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?user) { user };
    };
  };

  public query ({ caller }) func getUser(user : Principal) : async User {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can fetch other users");
    };
    switch (users.get(user)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?user) { user };
    };
  };

  public query ({ caller }) func getUserByUsername(username : Text) : async User {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can search by username");
    };

    let foundUser = users.values().find(
      func(user) {
        Text.equal(username.toLower(), user.username.toLower());
      }
    );
    switch (foundUser) {
      case (null) { Runtime.trap("User does not exist") };
      case (?user) { user };
    };
  };

  public shared ({ caller }) func registerUser(name : Text, username : Text) : async User {
    let validatedUsername = username.toLower();

    if (users.containsKey(caller)) {
      Runtime.trap("User is already registered");
    };

    if (not Helpers.validateUsername(validatedUsername)) { Runtime.trap("Invalid username format") };

    let existingUsername = users.values().find(
      func(user) { Text.equal(user.username, validatedUsername) }
    );
    if (existingUsername != null) {
      Runtime.trap("Username is already in use");
    };

    let user = {
      principal = caller;
      name;
      username = validatedUsername;
    };

    users.add(caller, user);
    user;
  };

  public query ({ caller }) func searchUsers(searchTerm : Text, limit : Nat) : async [User] {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can search");
    };

    let filtered = users.values().toArray().filter(
      func(user) {
        user.username.toLower().startsWith(#text(searchTerm.toLower()));
      }
    );
    let sorted = filtered.sort();
    let limitedResultsSize = if (sorted.size() > limit) { limit } else { sorted.size() };
    let limitedResults = List.empty<User>();
    for (i in Nat.range(0, limitedResultsSize)) {
      limitedResults.add(sorted[i]);
    };
    limitedResults.toArray();
  };

  public query ({ caller }) func getMyChats() : async [Chat] {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can fetch chats");
    };

    let myChatsList = List.empty<Chat>();

    for ((_, chat) in chats.entries()) {
      let isParticipant = chat.participants.find(
        func(participant) { participant.principal == caller }
      );
      if (isParticipant != null) {
        myChatsList.add(chat);
      };
    };
    myChatsList.toArray();
  };

  public query ({ caller }) func getChat(chatId : ChatId) : async Chat {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can fetch chats");
    };

    let chat = switch (chats.get(chatId)) {
      case (?chat) { chat };
      case (null) { Runtime.trap("Chat does not exist") };
    };

    let isParticipant = chat.participants.find(
      func(participant) { participant.principal == caller }
    );
    if (isParticipant == null) {
      Runtime.trap("Unauthorized: You are not a participant in this chat");
    };

    chat;
  };

  public shared ({ caller }) func createGroupChat(name : Text, participants : [Principal]) : async Chat {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can create chats");
    };

    let creator = switch (users.get(caller)) {
      case (null) { Runtime.trap("Creator does not exist") };
      case (?creator) { creator };
    };

    let groupParticipants = List.empty<User>();
    groupParticipants.add(creator);

    for (user in participants.values()) {
      let participant = switch (users.get(user)) {
        case (?participant) { participant };
        case (null) {
          Runtime.trap("User does not exist: " # user.toText());
        };
      };
      groupParticipants.add(participant);
    };

    let chatId = getNextId();

    let chat = {
      id = chatId;
      name;
      messages = [];
      participants = groupParticipants.toArray();
      chatType = #group;
      createdBy = creator;
      createdAt = Time.now();
      lastMessage = null;
    };

    chats.add(chatId, chat);
    chat;
  };

  public shared ({ caller }) func createDirectChat(otherUser : Principal) : async Chat {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can create chats");
    };

    let user = switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?user) { user };
    };

    let other = switch (users.get(otherUser)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?other) { other };
    };

    let chatId = getNextId();

    let chat = {
      id = chatId;
      name = "";
      messages = [];
      participants = [user, other];
      chatType = #direct;
      createdBy = user;
      createdAt = Time.now();
      lastMessage = null;
    };

    chats.add(chatId, chat);
    chat;
  };

  public shared ({ caller }) func sendMessage(messageInput : MessageInput) : async Message {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can send messages");
    };

    let sender = switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?sender) { sender };
    };

    let chat = switch (chats.get(messageInput.chatId)) {
      case (?chat) { chat };
      case (null) { Runtime.trap("Chat does not exist") };
    };

    let isParticipant = chat.participants.find(
      func(user) { user.principal == sender.principal }
    );
    switch (isParticipant) {
      case (null) {
        Runtime.trap("You are not a participant in chat");
      };
      case (?_) {};
    };

    let messageId = getNextId();

    let message = {
      id = messageId;
      sender;
      content = messageInput.content;
      timestamp = Time.now();
    };

    let messages = List.empty<Message>();
    for (existingMessage in chat.messages.values()) {
      messages.add(existingMessage);
    };
    messages.add(message);

    let updatedChat = {
      chat with
      messages = messages.toArray();
      lastMessage = ?message;
    };

    chats.add(chat.id, updatedChat);
    message;
  };

  public shared ({ caller }) func deleteAccount() : async () {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can delete accounts");
    };
    // Remove user data
    users.remove(caller);
    avatarImages.remove(caller);

    // Remove all direct chats the caller participated in,
    // and remove caller from group chat participant lists
    let chatsToDelete = List.empty<ChatId>();
    let chatsToUpdate = List.empty<(ChatId, Chat)>();

    for ((chatId, chat) in chats.entries()) {
      let isParticipant = chat.participants.find(
        func(p) { p.principal == caller }
      );
      if (isParticipant != null) {
        switch (chat.chatType) {
          case (#direct) {
            chatsToDelete.add(chatId);
          };
          case (#group) {
            let remaining = chat.participants.filter(
              func(p) { p.principal != caller }
            );
            let updatedChat = { chat with participants = remaining };
            chatsToUpdate.add((chatId, updatedChat));
          };
        };
      };
    };

    for (chatId in chatsToDelete.values()) {
      chats.remove(chatId);
    };
    for ((chatId, updatedChat) in chatsToUpdate.values()) {
      chats.add(chatId, updatedChat);
    };
  };

  // AVATAR IMAGE FUNCTIONS

  public shared ({ caller }) func setMyAvatarImage(image : Text) : async () {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can set avatar images");
    };
    avatarImages.add(caller, image);
  };

  public shared ({ caller }) func removeMyAvatarImage() : async () {
    if (not users.containsKey(caller)) {
      Runtime.trap("Unauthorized: Only registered users can remove avatar images");
    };
    avatarImages.remove(caller);
  };

  public query func getAvatarImage(user : Principal) : async ?Text {
    avatarImages.get(user);
  };

  public type SystemMsg = {
    message : Text;
    timestamp : Time.Time;
  };

  system func preupgrade() {
    usersEntries := users.toArray();
    chatsEntries := chats.toArray();
    avatarImagesEntries := avatarImages.toArray();
  };

  system func postupgrade() {
    users := Map.fromIter(usersEntries.values());
    chats := Map.fromIter(chatsEntries.values());
    avatarImages := Map.fromIter(avatarImagesEntries.values());
    usersEntries := [];
    chatsEntries := [];
    avatarImagesEntries := [];
  };

  func getNextId() : Nat32 {
    currentId += 1;
    Nat32.fromNat(currentId);
  };
};
