import io from "socket.io-client";

let uri = "http://localhost:3001";
export const socket = io(uri, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 2,
  reconnectionDelay: 10000,
});
