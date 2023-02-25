/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { socket } from '../utils/socket';
import { iceConfig } from '../config/iceConfig';

export default function ProducerView() {
	const peers: any = {};
	const name = 'Wayne';
	const localVideoRef = React.useRef(null);

	React.useEffect(() => {
		console.clear();
		startStream();

		return () => {
			endStream();
		};
	}, []);

	const startStream = async () => {
		navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
			(window as any).stream = stream;
			(localVideoRef as any).current.srcObject = stream;

			socket.emit('join', { id: name });
			socket.emit('producer', { name: name });
		});

		socket.on('consumer', async (payload) => {
			console.clear();
			const peer = new RTCPeerConnection(iceConfig as any);
			peers[payload.id] = peer;
			console.log('incoming consumer:', payload);

			const stream = (localVideoRef as any).current.srcObject;
			stream.getTracks().forEach((track: any) => peers[payload.id].addTrack(track, stream));

			peers[payload.id].ontrack = ({ streams }: { streams: any }) => {
				console.log('creating vid el', payload);

				return createVideoElement({ id: payload.id, stream: new MediaStream(streams[0]) });
			};

			const offer = await peers[payload.id].createOffer();
			const desc = new RTCSessionDescription(offer);
			await peers[payload.id].setLocalDescription(desc);

			console.log('sending offer', { id: payload.id, name: payload.name, sdp: offer });
			socket.emit('offer', { id: payload.id, name, sdp: offer });

			peers[payload.id].onicecandidate = (event: any) => {
				if (event.candidate) {
					console.log('ICE to:', payload);
					socket.emit('candidate', { id: payload.id, name, candidate: event.candidate });
				}
			};

			peers[payload.id].onconnectionstatechange = (event: any) => {
				console.log('state change', peers[payload.id].connectionState);

				if (peers[payload.id].connectionState === 'failed' || peers[payload.id].connectionState === 'disconnected') {
					console.log('removing vid el', payload);
					removeVideoElement({ id: payload.id });
				}
			};
		});

		socket.on('answer', async (payload) => {
			if (peers[payload.id].signalingState === 'have-local-offer') {
				const desc = new RTCSessionDescription(payload.sdp);
				await peers[payload.id].setRemoteDescription(desc);
				console.log('setting answer', payload);
			}
		});

		socket.on('candidate', (payload) => {
			if (payload.candidate) {
				console.log('ICE from:', payload);
				peers[payload.id].addIceCandidate(new RTCIceCandidate(payload.candidate));
			}
		});
	};

	const createVideoElement = ({ id, stream }: { id: string; stream: object }) => {
		(window as any).stream = stream;
		const videoGrid = document.getElementById('video-grid');
		const videoEl = document.createElement('video');
		videoEl.id = `vid_${id}`;
		videoEl.srcObject = stream as any;
		videoEl.muted = true;
		videoEl.autoplay = true;
		videoEl.playsInline = true;
		videoEl.style.height = '300px';
		videoEl.style.width = '300px';
		videoEl.style.objectFit = 'cover';
		videoEl.controls = true;
		videoGrid?.appendChild(videoEl);
	};

	const removeVideoElement = ({ id }: { id: string }) => {
		const videoEl = document.getElementById(`vid_${id}`);
		videoEl?.remove();
	};

	const endStream = async () => {
		Object.entries(peers).forEach((peer: any) => peer.close());
	};

	return (
		<div id='video-grid'>
			<video
				ref={localVideoRef}
				muted
				autoPlay
				playsInline
				style={{ height: '300px', width: '300px', objectFit: 'cover' }}
			/>
		</div>
	);
}
