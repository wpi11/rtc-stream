/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iceConfig } from '../../config/iceConfig';
import { socket } from '../../utils/socket';
import RTCFactory from '../../modules/RTCPeer2Peer';
import { createVideoElement } from '../../utils/createVideoElement';
import { removeVideoElement } from '../../utils/removeVideoElement';

export default function Host() {
	const params = new URLSearchParams(window.location.search);
	const name = params.get('name') as string;
	const room = params.get('room') as string;
	const navigate = useNavigate();

	const rtc = new RTCFactory({
		socket,
		pcConfig: iceConfig,
		logging: {
			log: true,
			warn: true,
			error: false
		}
	});

	React.useEffect(() => {
		// producer event: create room
		rtc.on('created', (event: any) => {
			rtc.log('created:', event);
			rtc.streamReady();
		});
		// consumer event: join room
		rtc.on('joined', (event: any) => {
			rtc.log('joined:', event);
			rtc.streamReady();
		});
		// stream event: add stream
		rtc.on('stream', (event: any) => {
			rtc.log('stream:', event);
			createVideoElement({ id: event.id, stream: event.stream });
		});
		// stream event: remove stream
		rtc.on('leave', (event: any) => {
			rtc.log('leave:', event);
			removeVideoElement({ id: event.id });
		});

		rtc.on('error', (event: any) => {
			rtc.log('Error:', event);
		});

		return () => {
			rtc.clean();
		};
	}, []);

	const handleStart = () => {
		rtc.getMyStream({ name }).then((stream) => {
			createVideoElement({ id: name, stream });
		});
	};

	const handleJoin = () => {
		rtc.joinRoom(room);
	};

	const handleLeave = () => {
		rtc.leaveRoom(room);
		rtc.clean();
		navigate('/');
	};

	return (
		<div>
			<button onClick={handleStart}>Start</button>
			<button onClick={handleJoin}>Join</button>
			<button onClick={handleLeave}>Leave</button>
			<div id='video-grid' />
		</div>
	);
}
