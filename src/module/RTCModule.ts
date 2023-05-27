import io, { Socket, ManagerOptions } from "socket.io-client";
import EventEmitter from "eventemitter3";
import { IPeers, IStreams, ILogs } from "../types/rtc-module.types";
import { removeVideoElement } from "../utils/removeVideoElement";

const defaultSocketOptions: Partial<ManagerOptions> = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 2,
  reconnectionDelay: 10000,
  transports: ["polling", "websocket"],
};

const defaultLoggingOptions = {
  log: true,
  warn: true,
  error: true,
};

/**
 * Create socket.io instance.
 */
const createSocket = (overrideOptions?: Partial<ManagerOptions>) =>
  io(window.location.host, { ...defaultSocketOptions, ...overrideOptions });
/**
 * RTCModule configuration types
 */
interface RTCModuleType {
  /**
   * Server path uri
   */
  path: string;
  /**
   * Socket.io config override
   */
  ioOptions?: ManagerOptions;
  /**
   * WebRTC ICE configuration
   */
  iceConfig: RTCConfiguration;
  /**
   * RTCModule logging
   */
  logging?: {
    log: boolean;
    warn: boolean;
    error: boolean;
  };
}

/**
 * @package RTCModule
 * @param path {string} - server url.
 * @param iceConfig {string} - WebRTC ICE configuration options
 */
class RTCModule extends EventEmitter {
  private _peers: IPeers = {};
  private _streams: IStreams;
  private _localStream: MediaStream | undefined;
  private _myId: string | undefined;
  private _isAdmin: boolean | undefined;
  log: ILogs["log"];
  warn: ILogs["warn"];
  error: ILogs["error"];
  user: { name?: string };
  room: string | undefined;
  socket: Socket;
  iceConfig: RTCConfiguration;
  connectReady: boolean;
  isOriginator: boolean;
  inCall: boolean;
  isSetup: boolean;

  constructor({
    path = window.location.host,
    ioOptions,
    iceConfig,
    logging = defaultLoggingOptions,
  }: RTCModuleType) {
    super();
    this.log = logging.log ? console.log : () => {};
    this.warn = logging.warn ? console.warn : () => {};
    this.error = logging.error ? console.error : () => {};
    this.socket = createSocket(ioOptions);
    this.iceConfig = iceConfig;
    this._streams = {};
    this.user = {};
    this.isOriginator = false;
    this.connectReady = false;
    this.inCall = false;
    this.isSetup = false;
    this.log("client > rtc launched..", { path, ioOptions, iceConfig });
  }

  // setup will setup and print any missing required options
  setup({ name, gridId }: { name: string; gridId: string }) {
    this.log("client > setup starting..");
    let videoGrid = null;

    try {
      if (!window) {
        console.log("Note: window object is not detected.");
      } else {
        videoGrid = document.getElementById(gridId);
      }

      if (!videoGrid && window) {
        throw new Error(`Element with id '${gridId}' is required.`);
      }

      if (!name) {
        throw new Error(
          `"name" is required in "rtc.setup({ name: 'name', gridId: 'id' })".`
        );
      }

      if (!gridId) {
        throw new Error(
          `"gridId" is required in "rtc.setup({ name: 'name', gridId: 'id' })".`
        );
      }

      this.user.name = name;
      this.isSetup = true;
      this.log("client > rtc setup successful!");
    } catch (err: Error | any) {
      this.error("rtc setup failed.", err.message);
    }
  }

  // get stream ready
  async getMyStream() {
    if (!this.isSetup) {
      throw new Error(
        'RTC module is not setup. Have you called "rtc.setup()"?'
      );
    }

    return navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((stream) => {
        this.log("client > media stream ready.");
        return (this._localStream = stream);
      });
  }

  // initialize listeners
  startListeners() {
    this._establishSocketListeners();
    this.log("client > rtc listeners activated.");
  }

  // establish socket listeners
  private _establishSocketListeners() {
    // if already connected, disconnect to start new connection
    if (!this.socket.connected) this.socket.disconnect();
    // initial connect
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
      this.log("client > websockets ready.");
      this.emit("connect");
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
        this._peers[socketId] &&
        this._peers[socketId].connectionState === "connected"
      ) {
        this.log("Connection with", socketId, "is already established", {
          peersEstablished: this._peers,
        });
        return;
      }

      switch (event.type) {
        case "stream-ready":
          this._connectPeer(socketId);
          this.log(
            "client -> stream is ready, creating peer, adding stream, and making offer:",
            {
              myId: this._myId,
              theirId: socketId,
              streams: this._streams,
              connections: this._peers,
            }
          );
          return;
        case "offer":
          if (!this._peers[socketId]) {
            this._connectPeer(socketId);
          }
          this._peers[socketId].setRemoteDescription(
            new RTCSessionDescription(event.sdp)
          );
          this._rtcEvents.makeAnswer(socketId);
          return;
        case "answer":
          this._peers[socketId].setRemoteDescription(
            new RTCSessionDescription(event.sdp)
          );
          return;
        case "candidate":
          if (!event?.candidate) {
            return this.error("Client is missing event candidate.");
          }
          this.inCall = true;
          const candidate = new RTCIceCandidate(event.candidate);
          this._peers[socketId].addIceCandidate(candidate);
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
      this.log("Making offer:", { peer: this._peers[socketId] });

      this._peers[socketId]
        .createOffer()
        .then(
          this._rtcEvents.sendLocalDescription.bind(this, socketId),
          this._rtcEvents.createOfferError
        );
    },
    makeAnswer: (socketId: string) => {
      this.log("Sending answer:", { peer: this._peers[socketId] });

      this._peers[socketId]
        .createAnswer()
        .then(
          this._rtcEvents.sendLocalDescription.bind(this, socketId),
          this._rtcEvents.sdpError
        );
    },
    sendLocalDescription: async (socketId: string, sessionDescription: any) => {
      try {
        await this._peers[socketId].setLocalDescription(sessionDescription);
        this._sendMessage({
          toId: socketId,
          name: this.user.name,
          room: this.room,
          sdp: sessionDescription,
          type: sessionDescription.type,
        });
      } catch (e) {
        if (this._peers[socketId].connectionState !== "new") {
          this.error("Failed to setLocalDescription", {
            state: this._peers[socketId].connectionState,
            peer: this._peers[socketId],
            peers: this._peers,
          });
        }
      }
    },
    addTrack: (socketId: string, event: { streams: MediaStream[] }) => {
      this.log("Remote stream added for ", this._peers[socketId]);

      if (this._streams[socketId]?.id !== event.streams[0].id) {
        this._streams[socketId] = event.streams[0];

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
        this._peers[socketId].connectionState;
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
      if (this._peers[socketId]) {
        // do not create peer if connection is already established
        this.warn("You're already connected with:", socketId);
        return;
      }

      this._peers[socketId] = new RTCPeerConnection(
        this.iceConfig as RTCConfiguration
      );
      this._peers[socketId].onicecandidate = this._rtcEvents.iceCandidate.bind(
        this,
        socketId
      );
      this._peers[socketId].ontrack = this._rtcEvents.addTrack.bind(
        this,
        socketId
      );
      this._peers[socketId].onremovetrack = this._rtcEvents.removeTrack.bind(
        this,
        socketId
      );
      this._peers[socketId].onconnectionstatechange =
        this._rtcEvents.stateChange.bind(this, socketId);

      this.log("Created RTC Peer for:", { socketId, peers: this._peers });
    } catch (error: any) {
      this.error("RTC Peer failed: " + error.message);

      this.emit("error", {
        error: new Error(`RTC Peer failed: ${error.message}`),
      });
    }
  }

  // connect rtc peer connection
  private _connectPeer(socketId: string) {
    if (!socketId) {
      throw new Error("_connectPeer requires socket id.");
    }

    if (this._localStream === undefined && !this.connectReady) {
      return this.warn("This remote peer is not ready for connection.", {
        ready: this.connectReady,
        localStream: this._localStream,
        id: socketId,
      });
    }

    this._createPeer(socketId);
    this._peers[socketId].addStream(this._localStream);

    if (this.isOriginator) {
      this.log("client > you are the host.");
      this.log("client > creating offer:", socketId);

      this._rtcEvents.makeOffer(socketId);
    } else {
      this.log("client > you are the agent.");
    }
  }

  private _removePeer(socketId: string) {
    if (!socketId) {
      this._peers.forEach((peer: any, index: number) => {
        this.log("Closing peer connection:", { id: socketId, peer });
        peer.close();
        delete this._peers[index];
      });
      this._streams = {};
    } else {
      if (!this._peers[socketId]) return;
      this._peers[socketId].close();
      delete this._peers[socketId];
      delete this._peers[socketId];
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
    this.log("client > create or join", { name: this.user.name, room });
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

  stopListeners() {
    this.removeAllListeners();
    this.socket.removeAllListeners();
    if (this._myId) {
      this._peers[this._myId as string]?.close();
      this._localStream?.getTracks().forEach((track) => track.stop());
      removeVideoElement({ id: this._myId });
      this.log("Destroyed RTC session.");
    }
  }
}

export default RTCModule;
