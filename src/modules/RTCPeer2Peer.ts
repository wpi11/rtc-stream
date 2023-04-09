// import { Socket } from 'socket.io-client';
import { IceConfig } from "../config/iceConfig";
import { IPeers, IStreams, ILogs } from "../types/RTCFactory.types";
import EventEmitter from "eventemitter3";
import { removeVideoElement } from "../utils/removeVideoElement";
import { Socket } from "socket.io-client";

class RTCPeer2Peer extends EventEmitter {
  private peers: IPeers = {};
  private streams: IStreams;
  private _localStream: MediaStream | undefined;
  private _myId: string | undefined;
  private _isAdmin: boolean | undefined;
  log: ILogs["log"];
  warn: ILogs["warn"];
  error: ILogs["error"];
  user: { name?: string };
  room: string | undefined;
  socket: Socket;
  pcConfig: IceConfig;
  connectReady: boolean;
  isOriginator: boolean;
  inCall: boolean;

  constructor({
    socket,
    pcConfig,
    logging = { log: true, warn: true, error: true },
  }: {
    socket: any;
    pcConfig: IceConfig;
    logging: { log?: boolean; warn?: boolean; error?: boolean };
  }) {
    super();
    this.log = logging.log ? console.log : () => {};
    this.warn = logging.warn ? console.warn : () => {};
    this.error = logging.error ? console.error : () => {};
    this.socket = socket;
    this.pcConfig = pcConfig as IceConfig;
    this.streams = {};
    this.user = {};
    this.isOriginator = false;
    this.connectReady = false;
    this.inCall = false;
  }

  // get stream ready
  async getMyStream({ name, gridId }: { name: string; gridId: string }) {
    const videoGrid = document.getElementById(gridId);

    if (!name) {
      throw new Error(`Video name in stream options is required.`);
    }

    if (!gridId) {
      throw new Error(`Video gridId in stream options is required.`);
    }

    if (!videoGrid) {
      throw new Error(`Element with id '${gridId}' is required.`);
    }

    return navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((stream) => {
        this.log("Media stream ready.");
        this.user.name = name;
        return (this._localStream = stream);
      });
  }

  // initialize listeners
  initListeners() {
    this._establishSocketListeners();
  }

  // establish socket listeners
  private _establishSocketListeners() {
    // initial connect
    // if (!this.socket.connected)
    this.socket.disconnect();
    this.socket.connect();
    // listen for connection confirmation
    this.socket.on("connect", this._socketEvents.connect.bind(this));
    // logger event
    this.socket.on("log", this._socketEvents.log.bind(this));
    // created room event
    this.socket.on("created", this._socketEvents.created.bind(this));
    // joined room event
    this.socket.on("joined", this._socketEvents.joined.bind(this));
    // join room event
    this.socket.on("join", this._socketEvents.join.bind(this));
    // signal message event
    this.socket.on("message", this._socketEvents.message.bind(this));
    // room ready event
    this.socket.on("ready", this._socketEvents.ready.bind(this));
    // stream ready event
    this.socket.on("stream", this._socketEvents.stream.bind(this));
  }

  // socket listener events
  private _socketEvents = {
    log: (event: [message?: any, ...optionalParams: any[]]) => {
      this.log.apply(console, event);
    },
    connect: () => {
      this.log("RTC sockets ready.");
      return this;
    },
    created: (event: { id: string | undefined; room: string | undefined }) => {
      this._myId = event.id;
      this.room = event.room;
      this.isOriginator = true;
      this._isAdmin = true;

      this.log("Created room:", { event });
      this.emit("created", event);
    },
    joined: (event: {
      id: string | undefined;
      room: string | undefined;
      user: any;
    }) => {
      this._myId = event.id;
      this.room = event.room;
      this.connectReady = true;
      this.log("Joined room:", { event });
      this.emit("joined", event);
    },
    join: () => {
      this.connectReady = true;

      this.emit("newJoin", { newJoin: true });
    },
    message: (event: {
      id: any;
      type: string;
      sdp: RTCSessionDescriptionInit;
      candidate: RTCIceCandidateInit | undefined;
    }) => {
      const socketId = event.id;

      if (event.type === "left") {
        this.log(socketId, "has left the call.", { event });

        this._removePeer(socketId);
        this.isOriginator = true;

        this.emit("userLeave", { id: socketId });
        return;
      }

      // prevent duplicate connection attempts
      if (
        this.peers[socketId] &&
        this.peers[socketId].connectionState === "connected"
      ) {
        this.log("Connection with", socketId, "is already established", {
          peersEstablished: this.peers,
        });
        return;
      }

      switch (event.type) {
        case "stream-ready":
          this._connectPeer(socketId);
          this.log(
            "Client -> Incoming stream, creating peer, adding stream, and making offer:",
            {
              myId: this._myId,
              theirId: socketId,
              streams: this.streams,
              connections: this.peers,
            }
          );
          return;
        case "offer":
          if (!this.peers[socketId]) {
            this._connectPeer(socketId);
          }
          this.peers[socketId].setRemoteDescription(
            new RTCSessionDescription(event.sdp)
          );
          this._rtcEvents.makeAnswer(socketId);
          return;
        case "answer":
          this.peers[socketId].setRemoteDescription(
            new RTCSessionDescription(event.sdp)
          );
          return;
        case "candidate":
          if (!event?.candidate) {
            return this.error("Client is missing event candidate.");
          }
          this.inCall = true;
          const candidate = new RTCIceCandidate(event.candidate);
          this.peers[socketId].addIceCandidate(candidate);
          return;
        default:
          return;
      }
    },
    ready: (event: { id: string | undefined }) => {
      if (event.id !== this._myId) this.isOriginator = true;
    },
    stream() {
      console.log("TODO socket stream event!");
    },
  };

  private _rtcEvents = {
    makeOffer: (socketId: string) => {
      this.log("Making offer:", { peer: this.peers[socketId] });

      this.peers[socketId]
        .createOffer()
        .then(
          this._rtcEvents.sendLocalDescription.bind(this, socketId),
          this._rtcEvents.createOfferError
        );
    },
    makeAnswer: (socketId: string) => {
      this.log("Sending answer:", { peer: this.peers[socketId] });

      this.peers[socketId]
        .createAnswer()
        .then(
          this._rtcEvents.sendLocalDescription.bind(this, socketId),
          this._rtcEvents.sdpError
        );
    },
    sendLocalDescription: async (socketId: string, sessionDescription: any) => {
      try {
        await this.peers[socketId].setLocalDescription(sessionDescription);
        this._sendMessage({
          toId: socketId,
          name: this.user.name,
          room: this.room,
          sdp: sessionDescription,
          type: sessionDescription.type,
        });
      } catch (e) {
        if (this.peers[socketId].connectionState !== "new") {
          this.error("Failed to setLocalDescription", {
            state: this.peers[socketId].connectionState,
            peer: this.peers[socketId],
            peers: this.peers,
          });
        }
      }
    },
    addTrack: (socketId: string, event: { streams: MediaStream[] }) => {
      this.log("Remote stream added for ", this.peers[socketId]);

      if (this.streams[socketId]?.id !== event.streams[0].id) {
        this.streams[socketId] = event.streams[0];

        this.emit("stream", {
          id: socketId,
          stream: event.streams[0],
        });
        this.socket.emit("stream", {
          id: socketId,
          stream: event.streams[0],
        });
      }
    },
    removeTrack: (socketId: string, event: { streams: MediaStream[] }) => {
      this.isOriginator = false;
      this._removePeer(socketId);

      this.emit("left", {
        id: socketId,
        stream: event.streams[0],
      });
    },
    iceCandidate: (socketId: string, event: RTCIceCandidate) => {
      if (event.candidate) {
        this._sendMessage({
          toId: socketId,
          name: this.user.name,
          room: this.room,
          candidate: event.candidate,
          type: "candidate",
        });
      }
    },
    stateChange: (socketId: string, event: RTCSignalingState) => {
      const connectionState: RTCPeerConnectionState =
        this.peers[socketId].connectionState;
      this.log("RTC state change:", connectionState);
      if (connectionState === "disconnected" || connectionState === "failed") {
        this.emit("left", {
          id: socketId,
        });
      }
    },
    sdpError: (error: RTCError) => {
      this.log("Session description error: " + error.toString());

      this.emit("error", {
        error: new Error(`Session description error: ${error.toString()}`),
      });
    },
    createOfferError: () => {
      this.error("ERROR creating offer");

      this.emit("error", {
        error: new Error("Error while creating an offer"),
      });
    },
  };

  private async _createPeer(socketId: string) {
    try {
      if (this.peers[socketId]) {
        // do not create peer if connection is already established
        this.warn("You're already connected with:", socketId);
        return;
      }

      this.peers[socketId] = new RTCPeerConnection(
        this.pcConfig as RTCConfiguration
      );
      this.peers[socketId].onicecandidate = this._rtcEvents.iceCandidate.bind(
        this,
        socketId
      );
      this.peers[socketId].ontrack = this._rtcEvents.addTrack.bind(
        this,
        socketId
      );
      this.peers[socketId].onremovetrack = this._rtcEvents.removeTrack.bind(
        this,
        socketId
      );
      this.peers[socketId].onconnectionstatechange =
        this._rtcEvents.stateChange.bind(this, socketId);

      this.log("Created RTC Peer for:", { socketId, peers: this.peers });
    } catch (error: any) {
      this.error("RTC Peer failed: " + error.message);

      this.emit("error", {
        error: new Error(`RTC Peer failed: ${error.message}`),
      });
    }
  }

  // connect rtc peer connection
  private _connectPeer(socketId: string) {
    if (this._localStream === undefined && !this.connectReady) {
      return this.warn("This remote peer is not ready for connection.", {
        ready: this.connectReady,
        localStream: this._localStream,
        id: socketId,
      });
    }

    this._createPeer(socketId);
    this.peers[socketId].addStream(this._localStream);

    if (this.isOriginator) {
      this.log("FYI - You initiated this call.");
      this.log("Creating offer for:", socketId);

      this._rtcEvents.makeOffer(socketId);
    } else {
      this.log("FYI - You received this call.");
    }
  }

  private _removePeer(socketId: string) {
    if (!socketId) {
      this.peers.forEach((peer: any, index: number) => {
        this.log("Closing peer connection:", { id: socketId, peer });
        peer.close();
        delete this.peers[index];
      });
      this.streams = {};
    } else {
      if (!this.peers[socketId]) return;
      this.peers[socketId].close();
      delete this.peers[socketId];
      delete this.streams[socketId];
    }

    this.emit("left", { id: socketId });
  }

  // server event emitter
  private _sendMessage(event: any) {
    setTimeout(() => {
      this.socket.emit("message", { ...event, id: event.id });
    }, 0);
  }

  // public method: join room
  joinRoom(name: string, room: string) {
    if (this.room) {
      return this.warn("You are currently in a room.");
    }

    if (!room) {
      return this.error("Room name was not provided to join.");
    }

    // create room
    this.user.name = name;
    this.log("create or join", { name: this.user.name, room });
    this.socket.emit("create or join", {
      user: this.user,
      name: this.user.name,
      room,
    });
  }

  // public method: leave room
  leaveRoom(room: string) {
    // leave room
    this.log("leaving room", { name: this.user.name, room });

    this.isOriginator = false;
    this._sendMessage({ type: "left", user: this.user });
  }

  // public method: sends message to server
  // broadcasting stream is ready
  sendStreamReady() {
    if (this.room) {
      this._sendMessage({ type: "stream-ready", room: this.room });
    } else {
      this.warn("You need to join a room before streaming.");
    }
  }

  clean() {
    this.removeAllListeners();
    this.socket.removeAllListeners();
    if (this._myId) {
      this.peers[this._myId as string]?.close();
      this._localStream?.getTracks().forEach((track) => track.stop());
      removeVideoElement({ id: this._myId });
      this.log("Destroyed RTC session.");
    }
  }
}

export default RTCPeer2Peer;
