declare module "@waynecodez/wrtc-stream" {
  export default class StreamService {
    constructor(props: any);

    on: (arg0: string, arg2: any) => void;
    log: (arg0: string, arg2: any) => void;
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
