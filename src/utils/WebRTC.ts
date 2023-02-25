import { iceConfig } from '../config/iceConfig';
import { socket } from './socket';

export const peer = new RTCPeerConnection(iceConfig as any);

export default function RTCModule(id = 'default', eventCallback?: any, socketCallback?: any) {
	socket.connect();

	let peers: any = {};
	peers[id] = new RTCPeerConnection(iceConfig as any);
	let peer = peers[id];
	console.log('RTCModule connected peers:', peers);

	peer.socket = socket;
	peer.onnegotiationneeded = (event: any) => eventCallback?.({ onnegotiation: event });
	peer.onicecandidate = (event: any) => eventCallback?.({ candidate: event });
	peer.ontrack = (event: any) => eventCallback?.({ ontrack: event });
	peer.onconnectionstatechange = (event: any) => eventCallback?.({ statechange: event });

	peer.join = (payload: any) => socket.emit('join', { ...payload, id });
	peer.call = (payload: any) => socket.emit('call', { ...payload, id });
	peer.answer = (payload: any) => socket.emit('answer', { ...payload, id });

	socket.on('join', (payload) => socketCallback?.({ join: payload }));
	socket.on('call', (payload) => socketCallback?.({ call: payload }));
	socket.on('answer', (payload) => socketCallback?.({ answer: payload }));

	return peer;
}

let peers: any = {};
let localStream: any;
function RTCConnection({ id }: { id: string }) {
	peers[id] = new RTCPeerConnection(iceConfig as any);
	let peer: any = peers[id];

	const createStream = () => {
		navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then((stream) => {
			localStream = stream;

			stream.getTracks().forEach((track) => peer.addTrack(track, stream));
		});
	};

	const createOffer = async () => {
		const offer = await peer.createOffer();
		peer.setLocalDescription(offer);

		console.log(peer);
	};

	const onCustomEvent = new CustomEvent('custom', {
		detail: {
			localStream
		}
	});

	function onStream(this: any) {
		return this;
	}
	function onTrack(this: any) {
		return this;
	}
	function onNegotiation(this: any) {
		return this;
	}

	const events = {
		onStream: onStream.bind(localStream),
		onTrack: onTrack.bind(peers[id].ontrack),
		onNegotiation: onNegotiation.bind(peers[id].onnegotiationneeded)
	};

	return {
		events,
		onCustomEvent,
		createStream,
		createOffer
	};
}

export { RTCConnection };
