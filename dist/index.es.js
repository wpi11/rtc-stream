var h = (o, t) => () => (t || o((t = { exports: {} }).exports, t), t.exports);
import c from "eventemitter3";
var l = h((g, a) => {
  const d = ({ id: o }) => {
    document.getElementById(`vid_${o}`)?.remove();
  };
  class m extends c {
    constructor({
      socket: t,
      pcConfig: i,
      logging: r = { log: !0, warn: !0, error: !0 },
    }) {
      super(),
        (this.peers = {}),
        (this._socketEvents = {
          log: (e) => {
            this.log.apply(console, e);
          },
          connect: () => (this.log("RTC sockets ready."), this),
          created: (e) => {
            (this._myId = e.id),
              (this.room = e.room),
              (this.isOriginator = !0),
              (this._isAdmin = !0),
              this.log("Created room:", { event: e }),
              this.emit("created", e);
          },
          joined: (e) => {
            (this._myId = e.id),
              (this.room = e.room),
              (this.connectReady = !0),
              this.log("Joined room:", { event: e }),
              this.emit("joined", e);
          },
          join: () => {
            (this.connectReady = !0), this.emit("newJoin", { newJoin: !0 });
          },
          message: (e) => {
            const s = e.id;
            if (e.type === "left") {
              this.log(s, "has left the call.", { event: e }),
                this._removePeer(s),
                (this.isOriginator = !0),
                this.emit("userLeave", { id: s });
              return;
            }
            if (
              this.peers[s] &&
              this.peers[s].connectionState === "connected"
            ) {
              this.log("Connection with", s, "is already established", {
                peersEstablished: this.peers,
              });
              return;
            }
            switch (e.type) {
              case "stream-ready":
                this._connectPeer(s),
                  this.log(
                    "Client -> Incoming stream, creating peer, adding stream, and making offer:",
                    {
                      myId: this._myId,
                      theirId: s,
                      streams: this.streams,
                      connections: this.peers,
                    }
                  );
                return;
              case "offer":
                this.peers[s] || this._connectPeer(s),
                  this.peers[s].setRemoteDescription(
                    new RTCSessionDescription(e.sdp)
                  ),
                  this._rtcEvents.makeAnswer(s);
                return;
              case "answer":
                this.peers[s].setRemoteDescription(
                  new RTCSessionDescription(e.sdp)
                );
                return;
              case "candidate":
                if (!e?.candidate)
                  return this.error("Client is missing event candidate.");
                this.inCall = !0;
                const n = new RTCIceCandidate(e.candidate);
                this.peers[s].addIceCandidate(n);
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
          },
        }),
        (this._rtcEvents = {
          makeOffer: (e) => {
            this.log("Making offer:", { peer: this.peers[e] }),
              this.peers[e]
                .createOffer()
                .then(
                  this._rtcEvents.sendLocalDescription.bind(this, e),
                  this._rtcEvents.createOfferError
                );
          },
          makeAnswer: (e) => {
            this.log("Sending answer:", { peer: this.peers[e] }),
              this.peers[e]
                .createAnswer()
                .then(
                  this._rtcEvents.sendLocalDescription.bind(this, e),
                  this._rtcEvents.sdpError
                );
          },
          sendLocalDescription: async (e, s) => {
            try {
              await this.peers[e].setLocalDescription(s),
                this._sendMessage({
                  toId: e,
                  name: this.user.name,
                  room: this.room,
                  sdp: s,
                  type: s.type,
                });
            } catch {
              this.peers[e].connectionState !== "new" &&
                this.error("Failed to setLocalDescription", {
                  state: this.peers[e].connectionState,
                  peer: this.peers[e],
                  peers: this.peers,
                });
            }
          },
          addTrack: (e, s) => {
            this.log("Remote stream added for ", this.peers[e]),
              this.streams[e]?.id !== s.streams[0].id &&
                ((this.streams[e] = s.streams[0]),
                this.emit("stream", {
                  id: e,
                  stream: s.streams[0],
                }),
                this.socket.emit("stream", {
                  id: e,
                  stream: s.streams[0],
                }));
          },
          removeTrack: (e, s) => {
            (this.isOriginator = !1),
              this._removePeer(e),
              this.emit("left", {
                id: e,
                stream: s.streams[0],
              });
          },
          iceCandidate: (e, s) => {
            s.candidate &&
              this._sendMessage({
                toId: e,
                name: this.user.name,
                room: this.room,
                candidate: s.candidate,
                type: "candidate",
              });
          },
          stateChange: (e, s) => {
            const n = this.peers[e].connectionState;
            this.log("RTC state change:", n),
              (n === "disconnected" || n === "failed") &&
                this.emit("left", {
                  id: e,
                });
          },
          sdpError: (e) => {
            this.log("Session description error: " + e.toString()),
              this.emit("error", {
                error: new Error(`Session description error: ${e.toString()}`),
              });
          },
          createOfferError: () => {
            this.error("ERROR creating offer"),
              this.emit("error", {
                error: new Error("Error while creating an offer"),
              });
          },
        }),
        (this.log = r.log ? console.log : () => {}),
        (this.warn = r.warn ? console.warn : () => {}),
        (this.error = r.error ? console.error : () => {}),
        (this.socket = t),
        (this.pcConfig = i),
        (this.streams = {}),
        (this.user = {}),
        (this.isOriginator = !1),
        (this.connectReady = !1),
        (this.inCall = !1);
    }
    // get stream ready
    async getMyStream({ name: t, gridId: i }) {
      const r = document.getElementById(i);
      if (!t) throw new Error("Video name in stream options is required.");
      if (!i) throw new Error("Video gridId in stream options is required.");
      if (!r) throw new Error(`Element with id '${i}' is required.`);
      return navigator.mediaDevices
        .getUserMedia({ audio: !1, video: !0 })
        .then(
          (e) => (
            this.log("Media stream ready."),
            (this.user.name = t),
            (this._localStream = e)
          )
        );
    }
    // initialize listeners
    startListeners() {
      this._establishSocketListeners();
    }
    // establish socket listeners
    _establishSocketListeners() {
      this.socket.disconnect(),
        this.socket.connect(),
        this.socket.on("connect", this._socketEvents.connect.bind(this)),
        this.socket.on("log", this._socketEvents.log.bind(this)),
        this.socket.on("created", this._socketEvents.created.bind(this)),
        this.socket.on("joined", this._socketEvents.joined.bind(this)),
        this.socket.on("join", this._socketEvents.join.bind(this)),
        this.socket.on("message", this._socketEvents.message.bind(this)),
        this.socket.on("ready", this._socketEvents.ready.bind(this)),
        this.socket.on("stream", this._socketEvents.stream.bind(this));
    }
    async _createPeer(t) {
      try {
        if (this.peers[t]) {
          this.warn("You're already connected with:", t);
          return;
        }
        (this.peers[t] = new RTCPeerConnection(this.pcConfig)),
          (this.peers[t].onicecandidate = this._rtcEvents.iceCandidate.bind(
            this,
            t
          )),
          (this.peers[t].ontrack = this._rtcEvents.addTrack.bind(this, t)),
          (this.peers[t].onremovetrack = this._rtcEvents.removeTrack.bind(
            this,
            t
          )),
          (this.peers[t].onconnectionstatechange =
            this._rtcEvents.stateChange.bind(this, t)),
          this.log("Created RTC Peer for:", { socketId: t, peers: this.peers });
      } catch (i) {
        this.error("RTC Peer failed: " + i.message),
          this.emit("error", {
            error: new Error(`RTC Peer failed: ${i.message}`),
          });
      }
    }
    // connect rtc peer connection
    _connectPeer(t) {
      if (this._localStream === void 0 && !this.connectReady)
        return this.warn("This remote peer is not ready for connection.", {
          ready: this.connectReady,
          localStream: this._localStream,
          id: t,
        });
      this._createPeer(t),
        this.peers[t].addStream(this._localStream),
        this.isOriginator
          ? (this.log("FYI - You initiated this call."),
            this.log("Creating offer for:", t),
            this._rtcEvents.makeOffer(t))
          : this.log("FYI - You received this call.");
    }
    _removePeer(t) {
      if (!t)
        this.peers.forEach((i, r) => {
          this.log("Closing peer connection:", { id: t, peer: i }),
            i.close(),
            delete this.peers[r];
        }),
          (this.streams = {});
      else {
        if (!this.peers[t]) return;
        this.peers[t].close(), delete this.peers[t], delete this.streams[t];
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
      if (this.room) return this.warn("You are currently in a room.");
      if (!i) return this.error("Room name was not provided to join.");
      (this.user.name = t),
        this.log("create or join", { name: this.user.name, room: i }),
        this.socket.emit("create or join", {
          user: this.user,
          name: this.user.name,
          room: i,
        });
    }
    // public method: leave room
    leaveRoom(t) {
      this.log("leaving room", { name: this.user.name, room: t }),
        (this.isOriginator = !1),
        this._sendMessage({ type: "left", user: this.user });
    }
    // public method: sends message to server
    // broadcasting stream is ready
    sendStreamReady() {
      this.room
        ? this._sendMessage({ type: "stream-ready", room: this.room })
        : this.warn("You need to join a room before streaming.");
    }
    clean() {
      this.removeAllListeners(),
        this.socket.removeAllListeners(),
        this._myId &&
          (this.peers[this._myId]?.close(),
          this._localStream?.getTracks().forEach((t) => t.stop()),
          d({ id: this._myId }),
          this.log("Destroyed RTC session."));
    }
  }
  a.exports = m;
});
export default l();
//# sourceMappingURL=index.es.js.map
