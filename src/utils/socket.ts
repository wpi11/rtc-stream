import io from 'socket.io-client';

export const isDev = process.env.NODE_ENV === 'development';
const mode = isDev ? 'development' : 'production';

export const socket = io(`${window.location.host}`, {
	autoConnect: false,
	reconnection: true,
	reconnectionAttempts: 2,
	reconnectionDelay: 10000,
	transports: ['polling', 'websocket']
});

console.log('development mode:', mode);
