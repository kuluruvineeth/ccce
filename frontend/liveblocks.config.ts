// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import YLiveblocksProvider from "@liveblocks/yjs";
import { colors } from "./lib/colors";

const client = createClient({
  // publicApiKey: "",
  authEndpoint: "/api/lib-auth",
});

type Presence = {};
type Storage = {};
type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    color: keyof typeof colors;
  };
};
type RoomEvent = {};
type ThreadMetadata = {};

export type UserAwareness = {
  user?: UserMeta["info"];
};

export type AwarenessList = [number, UserAwareness][];

export const {
  RoomProvider,
  useRoom,
  useSelf,
  useOthers,
  useMyPresence,

  // Other hooks
  // ...
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(
  client
);

// declare global {
//   interface Liveblocks {
//     // Each user's Presence, for useMyPresence, useOthers, etc.
//     Presence: {
//       // Example, real-time cursor coordinates
//       // cursor: { x: number; y: number };
//     };

//     // The Storage tree for the room, for useMutation, useStorage, etc.
//     Storage: {
//       // Example, a conflict-free list
//       // animals: LiveList<string>;
//     };

//     // Custom user info set when authenticating with a secret key
//     UserMeta: {
//       id: string;
//       info: {
//         // Example properties, for useSelf, useUser, useOthers, etc.
//         // name: string;
//         // avatar: string;
//       };
//     };

//     // Custom events, for useBroadcastEvent, useEventListener
//     RoomEvent: {};
//     // Example has two events, using a union
//     // | { type: "PLAY" }
//     // | { type: "REACTION"; emoji: "🔥" };

//     // Custom metadata set on threads, for useThreads, useCreateThread, etc.
//     ThreadMetadata: {
//       // Example, attaching coordinates to a thread
//       // x: number;
//       // y: number;
//     };

//     // Custom room info set with resolveRoomsInfo, for useRoomInfo
//     RoomInfo: {
//       // Example, rooms with a title and url
//       // title: string;
//       // url: string;
//     };
//   }
// }

export type TypedLiveblocksProvider = YLiveblocksProvider<
  Presence,
  Storage,
  UserMeta,
  RoomEvent
>;
