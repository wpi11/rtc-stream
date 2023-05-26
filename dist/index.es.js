import h from "socket.io-client";
import c from "eventemitter3";
const d = ({ id: a }) => {
  document.getElementById(`vid_${a}`)?.remove();
}, m = {
  transports: ["polling", "websocket"]
}, l = {
  log: !0,
  warn: !0,
  error: !0
};
class f extends c {
  constructor({
    path: t,
    ioOptions: i,
    iceConfig: r,
    logging: n = l
  }) {
    super(), this._peers = {}, this._socketEvents = {
      log: (e) => {
        this.log.apply(console, e);
      },
      connect: () => (this.log("RTC sockets ready."), this),
      created: (e) => {
        this._myId = e.id, this.room = e.room, this.isOriginator = !0, this._isAdmin = !0, this.log("Created room:", { event: e }), this.emit("created", e);
      },
      joined: (e) => {
        this._myId = e.id, this.room = e.room, this.connectReady = !0, this.log("Joined room:", { event: e }), this.emit("joined", e);
      },
      join: () => {
        this.connectReady = !0, this.emit("newJoin", { newJoin: !0 });
      },
      message: (e) => {
        const s = e.id;
        if (e.type === "left") {
          this.log(s, "has left the call.", { event: e }), this._removePeer(s), this.isOriginator = !0, this.emit("userLeave", { id: s });
          return;
        }
        if (this._peers[s] && this._peers[s].connectionState === "connected") {
          this.log("Connection with", s, "is already established", {
            peersEstablished: this._peers
          });
          return;
        }
        switch (e.type) {
          case "stream-ready":
            this._connectPeer(s), this.log(
              "Client -> Incoming stream, creating peer, adding stream, and making offer:",
              {
                myId: this._myId,
                theirId: s,
                streams: this._streams,
                connections: this._peers
              }
            );
            return;
          case "offer":
            this._peers[s] || this._connectPeer(s), this._peers[s].setRemoteDescription(
              new RTCSessionDescription(e.sdp)
            ), this._rtcEvents.makeAnswer(s);
            return;
          case "answer":
            this._peers[s].setRemoteDescription(
              new RTCSessionDescription(e.sdp)
            );
            return;
          case "candidate":
            if (!e?.candidate)
              return this.error("Client is missing event candidate.");
            this.inCall = !0;
            const o = new RTCIceCandidate(e.candidate);
            this._peers[s].addIceCandidate(o);
            return;
          default:
            return;
        }
      },
      ready: (e) => {
        e.id !== this._myId && (this.isOriginator = !0);
      },
      stream() {
        console.log("TODO socket stream event!");
      }
    }, this._rtcEvents = {
      makeOffer: (e) => {
        this.log("Making offer:", { peer: this._peers[e] }), this._peers[e].createOffer().then(
          this._rtcEvents.sendLocalDescription.bind(this, e),
          this._rtcEvents.createOfferError
        );
      },
      makeAnswer: (e) => {
        this.log("Sending answer:", { peer: this._peers[e] }), this._peers[e].createAnswer().then(
          this._rtcEvents.sendLocalDescription.bind(this, e),
          this._rtcEvents.sdpError
        );
      },
      sendLocalDescription: async (e, s) => {
        try {
          await this._peers[e].setLocalDescription(s), this._sendMessage({
            toId: e,
            name: this.user.name,
            room: this.room,
            sdp: s,
            type: s.type
          });
        } catch {
          this._peers[e].connectionState !== "new" && this.error("Failed to setLocalDescription", {
            state: this._peers[e].connectionState,
            peer: this._peers[e],
            peers: this._peers
          });
        }
      },
      addTrack: (e, s) => {
        this.log("Remote stream added for ", this._peers[e]), this._streams[e]?.id !== s.streams[0].id && (this._streams[e] = s.streams[0], this.emit("stream", {
          id: e,
          stream: s.streams[0]
        }), this.socket.emit("stream", {
          id: e,
          stream: s.streams[0]
        }));
      },
      removeTrack: (e, s) => {
        this.isOriginator = !1, this._removePeer(e), this.emit("left", {
          id: e,
          stream: s.streams[0]
        });
      },
      iceCandidate: (e, s) => {
        s.candidate && this._sendMessage({
          toId: e,
          name: this.user.name,
          room: this.room,
          candidate: s.candidate,
          type: "candidate"
        });
      },
      stateChange: (e, s) => {
        const o = this._peers[e].connectionState;
        this.log("RTC state change:", o), (o === "disconnected" || o === "failed") && this.emit("left", {
          id: e
        });
      },
      sdpError: (e) => {
        this.log("Session description error: " + e.toString()), this.emit("error", {
          error: new Error(`Session description error: ${e.toString()}`)
        });
      },
      createOfferError: () => {
        this.error("ERROR creating offer"), this.emit("error", {
          error: new Error("Error while creating an offer")
        });
      }
    }, this.log = n.log ? console.log : () => {
    }, this.warn = n.warn ? console.warn : () => {
    }, this.error = n.error ? console.error : () => {
    }, this.socket = h(t, { ...m, ...i }), this.iceConfig = r, this._streams = {}, this.user = {}, this.isOriginator = !1, this.connectReady = !1, this.inCall = !1, this.isSetup = !1;
  }
  // setup will setup and print any missing required options
  setup({ name: t, gridId: i }) {
    let r = null;
    try {
      if (window ? r = document.getElementById(i) : console.log("Note: window object is not detected."), !r && window)
        throw new Error(`Element with id '${i}' is required.`);
      if (!t)
        throw new Error(
          `"name" is required in "rtc.setup({ name: 'name', gridId: 'id' })".`
        );
      if (!i)
        throw new Error(
          `"gridId" is required in "rtc.setup({ name: 'name', gridId: 'id' })".`
        );
      this.user.name = t, this.isSetup = !0;
    } catch (n) {
      console.error("setup failed.", n.message);
    }
  }
  // get stream ready
  async getMyStream() {
    if (!this.isSetup)
      throw new Error(
        'RTC module is not setup. Have you called "rtc.setup()"?'
      );
    return navigator.mediaDevices.getUserMedia({ audio: !1, video: !0 }).then((t) => (this.log("Media stream ready."), this._localStream = t));
  }
  // initialize listeners
  startListeners() {
    this._establishSocketListeners();
  }
  // establish socket listeners
  _establishSocketListeners() {
    this.socket.disconnect(), this.socket.connect(), this.socket.on("connect", this._socketEvents.connect.bind(this)), this.socket.on("log", this._socketEvents.log.bind(this)), this.socket.on("created", this._socketEvents.created.bind(this)), this.socket.on("joined", this._socketEvents.joined.bind(this)), this.socket.on("join", this._socketEvents.join.bind(this)), this.socket.on("message", this._socketEvents.message.bind(this)), this.socket.on("ready", this._socketEvents.ready.bind(this)), this.socket.on("stream", this._socketEvents.stream.bind(this));
  }
  async _createPeer(t) {
    try {
      if (this._peers[t]) {
        this.warn("You're already connected with:", t);
        return;
      }
      this._peers[t] = new RTCPeerConnection(
        this.iceConfig
      ), this._peers[t].onicecandidate = this._rtcEvents.iceCandidate.bind(
        this,
        t
      ), this._peers[t].ontrack = this._rtcEvents.addTrack.bind(
        this,
        t
      ), this._peers[t].onremovetrack = this._rtcEvents.removeTrack.bind(
        this,
        t
      ), this._peers[t].onconnectionstatechange = this._rtcEvents.stateChange.bind(this, t), this.log("Created RTC Peer for:", { socketId: t, peers: this._peers });
    } catch (i) {
      this.error("RTC Peer failed: " + i.message), this.emit("error", {
        error: new Error(`RTC Peer failed: ${i.message}`)
      });
    }
  }
  // connect rtc peer connection
  _connectPeer(t) {
    if (!t)
      throw new Error("_connectPeer requires socket id.");
    if (this._localStream === void 0 && !this.connectReady)
      return this.warn("This remote peer is not ready for connection.", {
        ready: this.connectReady,
        localStream: this._localStream,
        id: t
      });
    this._createPeer(t), this._peers[t].addStream(this._localStream), this.isOriginator ? (this.log("FYI - You initiated this call."), this.log("Creating offer for:", t), this._rtcEvents.makeOffer(t)) : this.log("FYI - You received this call.");
  }
  _removePeer(t) {
    if (!t)
      this._peers.forEach((i, r) => {
        this.log("Closing peer connection:", { id: t, peer: i }), i.close(), delete this._peers[r];
      }), this._streams = {};
    else {
      if (!this._peers[t])
        return;
      this._peers[t].close(), delete this._peers[t], delete this._peers[t];
    }
    this.emit("left", { id: t });
  }
  // server event emitter
  _sendMessage(t) {
    setTimeout(() => {
      this.socket.emit("message", { ...t, id: t.id });
    }, 0);
  }
  // public method: join room
  joinRoom(t, i) {
    if (this.room)
      return this.warn("You are currently in a room.");
    if (!i)
      return this.error("Room name was not provided to join.");
    this.user.name = t, this.log("create or join", { name: this.user.name, room: i }), this.socket.emit("create or join", {
      user: this.user,
      name: this.user.name,
      room: i
    });
  }
  // public method: leave room
  leaveRoom(t) {
    this.log("leaving room", { name: this.user.name, room: t }), this.isOriginator = !1, this._sendMessage({ type: "left", user: this.user });
  }
  // public method: sends message to server
  // broadcasting stream is ready
  sendStreamReady() {
    this.room ? this._sendMessage({ type: "stream-ready", room: this.room }) : this.warn("You need to join a room before streaming.");
  }
  stopListeners() {
    this.removeAllListeners(), this.socket.removeAllListeners(), this._myId && (this._peers[this._myId]?.close(), this._localStream?.getTracks().forEach((t) => t.stop()), d({ id: this._myId }), this.log("Destroyed RTC session."));
  }
}
export {
  f as default
};
//# sourceMappingURL=index.es.js.map
