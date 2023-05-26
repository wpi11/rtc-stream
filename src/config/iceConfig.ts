declare var process: {
  env: {
    NODE_ENV: string;
    REACT_APP_COTURN_TURN_URI: string;
    REACT_APP_COTURN_USER: string;
    REACT_APP_COTURN_PASS: string;
  };
};

const iceConfig: Partial<RTCConfiguration> = {
  iceServers: [
    {
      urls: process.env.REACT_APP_COTURN_TURN_URI,
      username: process.env.REACT_APP_COTURN_USER,
      credential: process.env.REACT_APP_COTURN_PASS,
    },
    {
      urls: process.env.REACT_APP_COTURN_TURN_URI,
      username: process.env.REACT_APP_COTURN_USER,
      credential: process.env.REACT_APP_COTURN_PASS,
    },
  ],
};

export { iceConfig };
