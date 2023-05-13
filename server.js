/* eslint-disable no-unused-vars */
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";

const PORT = 8080;

const app = express();
const server = http.Server(app);

export const isDev = process.env.NODE_ENV === "development";
const mode = isDev ? "development" : "production";

const io = new Server(server);

let producer = null;
let producers = {};
let clients = {};

io.on("connection", (socket) => {
  console.log("websocket server connected:", { id: socket.id, mode });

  function log() {
    const arr = ["Server ->"];
    arr.push.apply(arr, arguments);
    socket.emit("log", arr);
  }

  socket.on("producer", (payload) => {
    console.log("registered producer:", payload.name);
    producer = socket.id;
    socket.broadcast.emit("producer", { ...payload, id: socket.id });
  });

  socket.on("consumer", (payload) => {
    console.log("requesting consumer:", payload);
    socket.broadcast.emit("consumer", { ...payload, id: socket.id });
  });

  socket.on("offer", (payload) => {
    console.log("offer to:", payload.name, payload.id);
    socket.broadcast
      .to(payload.room)
      .emit("offer", { ...payload, id: socket.id });
  });

  socket.on("answer", (payload) => {
    console.log("answer to:", payload.name);
    socket.to(payload.id).emit("answer", { ...payload, id: socket.id });
  });

  socket.on("candidate", (payload) => {
    console.log("candidate to:", payload.name);
    socket.broadcast
      .to(payload.room)
      .emit("candidate", { ...payload, id: socket.id });
  });

  // Host
  socket.on("create or join", (event) => {
    const name = event.name;
    const room = event.room;
    log("created / joined room:", { name, room });

    // number of clients in the room
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    let numClients = clientsInRoom ? clientsInRoom.size : 0;

    if (numClients === 0) {
      log(`Producer ${name} created room:`, { room, numClients });
      producers[socket.id] = name;
      socket.join(room);
      socket.emit("created", { ...event, id: socket.id });
    } else {
      log(`Member ${name} joined room:`, { room, numClients });
      clients[socket.id] = name;

      io.sockets.in(room).emit("join", { ...event, id: socket.id });
      socket.join(room);
      io.to(socket.id).emit("joined", { ...event, id: socket.id });
      io.sockets.in(room).emit("ready", { ...event, id: socket.id });
    }
  });

  socket.on("message", (event) => {
    console.log("Client message:", socket.id, event.type);
    const toId = event?.toId;
    const room = event?.room;

    if (toId) {
      log("To Signal Message:", { socket: socket.id, event: event.type });
      console.log("To Signal Message:", {
        socket: socket.id,
        event: event.type,
      });
      io.to(toId).emit("message", { ...event, id: socket.id });
    } else if (room) {
      log("Room Signal Message:", { socket: socket.id, event: event.type });
      console.log("Room Signal Message:", {
        socket: socket.id,
        event: event.type,
        room,
      });
      socket.broadcast.to(room).emit("message", { ...event, id: socket.id });
    } else {
      log("Broadcast Signal:", { socket: socket.id, event: event.type });
      console.log("Broadcast Signal Message:", {
        socket: socket.id,
        event: event.type,
      });
      socket.broadcast.emit("message", { ...event, id: socket.id });
    }
  });

  socket.on("disconnect", () => {
    delete producers[socket.id];
    delete clients[socket.id];
    socket.leave();
  });
});

app.use(cors());

app.use(express.static("build"));

app.get("*", (req, res) => {
  res.sendFile(path.resolve("build/index.html"));
});

server.listen(PORT, () => {
  console.log(`rtc peer server listening on: ${PORT}`);
});
