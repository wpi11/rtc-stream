import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { iceConfig } from "../../config/iceConfig";
import { socket } from "../../utils/socket";
import RTCFactory from "../../modules/RTCPeer2Peer";
import { createVideoElement } from "../../utils/createVideoElement";
import { removeVideoElement } from "../../utils/removeVideoElement";
import "./Conference.css";

const rtc = new RTCFactory({
  socket,
  pcConfig: iceConfig,
  logging: {
    log: true,
    warn: false,
    error: false,
  },
});

export default function Conference() {
  // const params = new URLSearchParams(window.location.search);
  // const name = params.get("name") as string;
  // const room = params.get("room") as string;
  const { name, room } = useParams();
  const navigate = useNavigate();

  const LocalStreamConfig = {
    name: String(name),
    gridId: "video-grid",
  };

  const HostVideoDimensions = {
    height: 400,
    width: 400,
  };

  const RemoteVideoDimensions = React.useMemo(
    () => ({
      height: 200,
      width: 200,
    }),
    []
  );

  React.useEffect(() => {
    // host event: create room
    rtc.on("created", (event: any) => {
      rtc.log("created:", event);
      rtc.streamReady();
    });

    // participant event: join room
    rtc.on("joined", (event: any) => {
      rtc.log("joined:", event);
      rtc.streamReady();
    });

    // stream event: add stream
    rtc.on("stream", (event: any) => {
      rtc.log("stream:", event);
      createVideoElement({
        id: event.id,
        stream: event.stream,
        options: RemoteVideoDimensions,
      });
    });

    // stream event: remove stream
    rtc.on("leave", (event: any) => {
      rtc.log("leave:", event);
      removeVideoElement({ id: event.id });
    });

    // error event: error should be enabled in rtc options
    rtc.on("error", (event: any) => {
      rtc.log("Error:", event);
    });

    return () => {
      rtc.clean();
    };
  }, [RemoteVideoDimensions]);

  const handleStart = () => {
    rtc
      .getMyStream(LocalStreamConfig)
      .then((stream) => {
        rtc.initListeners();
        createVideoElement({
          id: String(name),
          stream,
          options: HostVideoDimensions,
        });
      })
      .catch((err) => console.error(err.message));
  };

  const handleJoin = () => {
    rtc.joinRoom(String(name), String(room));
  };

  const handleLeave = () => {
    rtc.leaveRoom(String(room));
    rtc.clean();
    navigate("/");
  };

  return (
    <div className="main">
      <h1>Conference: {room}</h1>

      <div className="controls">
        <button onClick={handleStart}>Start</button>
        <button onClick={handleJoin}>Join</button>
        <button onClick={handleLeave}>Leave</button>
      </div>
      <div id="video-grid" />
    </div>
  );
}
