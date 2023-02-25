/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { iceConfig } from '../config/iceConfig';
import { socket } from '../utils/socket';
import RTCFactory from '../utils/RTCFactory';
import { createVideoElement } from '../utils/createVideoElement';
import { removeVideoElement } from '../utils/removeVideoElement';
import EventsManager from '../utils/EventsManager';

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
		rtc.addEventListener('createdRoom', (event: any) => {
			rtc.log('createdRoom:', event.detail);
			rtc.streamReady();
		});
		// consumer event: join room
		rtc.addEventListener('joinedRoom', (event: any) => {
			rtc.log('joinedRoom:', event.detail);
			rtc.streamReady();
		});
		// stream event: add stream
		rtc.addEventListener('newStream', (event: any) => {
			rtc.log('newStream:', event);
			createVideoElement({ id: event.detail.id, stream: event.detail.stream });
		});
		// stream event: remove stream
		rtc.addEventListener('removeStream', (event: any) => {
			rtc.log('removeStream:', event);
			removeVideoElement({ id: event.detail.id });
		});

		rtc.addEventListener('error', (event: any) => {
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
