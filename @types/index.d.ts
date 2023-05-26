declare type ManagerOptions = import("socket.io-client").ManagerOptions;

declare module "@waynecodez/rtc-stream" {
  export default class StreamService {
    /**
     * StreamService module abstracts WebRTC / Socket.io peer connections
     */
    constructor(config: StreamServiceType);
    /**
     * RTC module setup method
     */
    setup: (config: { name: string; gridId: string }) => void;
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
    getMyStream: () => Promise<MediaStream>;

    startListeners: () => void;
    stopListeners: () => void;
  }
}

interface StreamServiceType {
  /**
   * Server path uri
   */
  path: string;
  /**
   * Socket.io config override
   */
  ioOptions?: Partial<ManagerOptions>;
  /**
   * WebRTC ICE configuration
   */
  iceConfig: RTCConfiguration;
  /**
   * StreamService logging
   */
  logging?: {
    log: boolean;
    warn: boolean;
    error: boolean;
  };
}
