interface StreamServiceConfig {
  /**
   * Socket.io instance
   */
  socket: object;
  /**
   * WebRTC ICE configuration
   */
  iceConfig: object;
  /**
   * StreamService logging
   */
  logging?: {
    log: boolean;
    warn: boolean;
    error: boolean;
  };
}

declare module "@waynecodez/wrtc-stream" {
  export default class StreamService {
    /**
     * StreamService module abstracts WebRTC / Socket.io peer connections
     */
    constructor(config: StreamServiceConfig);
    /**
     * socket.io `on` event listener
     */
    on: (arg0: string, arg2: any) => void;
    /**
     * socket.io `log` event emitter
     */
    log: (arg0: string, arg2: any) => void;
    /**
     * socket.io `error` event listener
     */
    error: (msg: string) => void;

    joinRoom: (name: string, room: string) => void;
    leaveRoom: (room: string) => void;

    sendStreamReady: () => void;
    getMyStream: (config: {
      name: string;
      gridId: string;
    }) => Promise<MediaStream>;

    startListeners: () => void;
    stopListeners: () => void;
  }
}
