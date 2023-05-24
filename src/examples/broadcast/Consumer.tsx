/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { socket } from "../../utils/socket";
import { iceConfig } from "../../config/iceConfig";
import { createVideoElement } from "../../utils/createVideoElement";

let peer: any = null;
let peers: any = {};
export default function Consumer() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  const localVideoRef = React.useRef(null);
  // const remoteVideoRef = React.useRef(null);

  React.useEffect(() => {
    console.clear();
    startStream();

    return () => {
      endStream();
    };
  }, []);

  const startStream = async () => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      (window as any).stream = stream;
      (localVideoRef as any).current.srcObject = stream;

      socket.emit("join", { id: name });
      socket.emit("consumer", { name });

      socket.on("consumer", () => {
        // socket.emit('consumer', { name });
      });
    });

    socket.on("producer", () => {
      socket.emit("consumer", { name });
    });

    socket.on("offer", async (payload) => {
      console.clear();
      peers[payload.id] = new RTCPeerConnection(iceConfig as any);
      peer = peers[payload.id];
      console.log("incoming offer:", payload);

      const stream = (window as any).stream;
      stream.getTracks().forEach((track: any) => peer.addTrack(track, stream));

      peer.ontrack = ({ streams }: { streams: any }) => {
        console.log("creating vid el", streams[0]);
        // (remoteVideoRef as any).current.srcObject = new MediaStream(streams[0]);
        createVideoElement({ id: payload.id, stream: streams[0] });
      };

      peer.onnegotiationneeded = () => {
        console.log("negotiation needed!");
      };

      const desc = new RTCSessionDescription(payload.sdp);
      peer.setRemoteDescription(desc);

      const answer = await peer.createAnswer();
      peer.setLocalDescription(answer);

      console.log("sending answer", { id: payload.id, name, sdp: answer });
      socket.emit("answer", { id: payload.id, name, sdp: answer });

      peer.onicecandidate = (event: any) => {
        if (event.candidate) {
          console.log("ICE to:", payload);
          socket.emit("candidate", {
            id: payload.id,
            name,
            candidate: event.candidate,
          });
        }
      };

      peer.onconnectionstatechange = (event: any) => {
        console.log("state change", peer.connectionState);

        if (
          peer.connectionState === "failed" ||
          peer.connectionState === "disconnected"
        ) {
          console.log("removing vid el", payload);
        }
      };
    });

    socket.on("candidate", (payload) => {
      if (payload.candidate) {
        console.log("ICE from:", payload);
        peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });
  };

  const endStream = async () => {
    peer.close();
  };

  return (
    <div id="video-grid">
      <video
        ref={localVideoRef}
        muted
        autoPlay
        playsInline
        style={{ height: "300px", width: "300px", objectFit: "cover" }}
      />
      {/* <video
				ref={remoteVideoRef}
				muted
				autoPlay
				playsInline
				style={{ height: '300px', width: '300px', objectFit: 'cover' }}
			/> */}
    </div>
  );
}
