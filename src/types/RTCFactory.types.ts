export interface IPeers {
  [index: string]: RTCPeerConnection | any;
}

export interface IStreams {
  [index: string]: MediaStream | undefined;
}

export interface ILogs {
  warn: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
  log: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
  error: {
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  };
}

export type ICallback = (...args: unknown[]) => void;

export interface IEventData {
  boundCallback: ICallback;

  userCallback: ICallback;

  id: string;

  isOnce: boolean | undefined;

  context: unknown;
}
