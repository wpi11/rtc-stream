export interface IceConfig {
	iceServers: Array<{
		urls: string | undefined;
		username: string | undefined;
		credential: string | undefined;
	}>;
}

const iceConfig: IceConfig = {
	iceServers: [
		{
			urls: process.env.REACT_APP_COTURN_TURN_URI,
			username: process.env.REACT_APP_COTURN_USER,
			credential: process.env.REACT_APP_COTURN_PASS
		},
		{
			urls: process.env.REACT_APP_COTURN_STUN_URI,
			username: process.env.REACT_APP_COTURN_USER,
			credential: process.env.REACT_APP_COTURN_PASS
		}
	]
};

export { iceConfig };
