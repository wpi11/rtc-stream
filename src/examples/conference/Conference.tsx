import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { iceConfig } from '../../config/iceConfig';
import { socket } from '../../utils/socket';
import StreamService from '@waynecodez/wrtc-stream';
import { createVideoElement } from '../../utils/createVideoElement';
import { removeVideoElement } from '../../utils/removeVideoElement';
import './Conference.css';

const rtc = new StreamService({
	socket,
	iceConfig,
	logging: {
		log: true,
		warn: false,
		error: false
	}
});

export default function Conference() {
	const [searchParams] = useSearchParams();
	const name = searchParams.get('name') as string;
	const room = searchParams.get('room') as string;

	const navigate = useNavigate();

	const LocalStreamConfig = {
		name: name,
		gridId: 'video-grid'
	};

	const LocalVideoDimensions = {
		height: 400,
		width: 400
	};

	const RemoteVideoDimensions = React.useMemo(
		() => ({
			height: 200,
			width: 200
		}),
		[]
	);

	React.useEffect(() => {
		// host event: create room
		rtc.on('created', (event: any) => {
			rtc.log('created:', event);
			rtc.sendStreamReady();
		});

		// participant event: join room
		rtc.on('joined', (event: any) => {
			rtc.log('joined:', event);
			rtc.sendStreamReady();
		});

		// stream event: add stream
		rtc.on('stream', (event: any) => {
			rtc.log('stream:', event);
			createVideoElement({
				id: event.id,
				stream: event.stream,
				options: RemoteVideoDimensions
			});
		});

		// stream event: remove stream
		rtc.on('left', (event: any) => {
			rtc.log('left:', event);
			removeVideoElement({ id: event.id });
		});

		// error event: error should be enabled in rtc options
		rtc.on('error', (event: any) => {
			rtc.log('Error:', event);
		});

		return () => {
			rtc.stopListeners();
		};
	}, [RemoteVideoDimensions]);

	const handleStart = () => {
		if (socket.connected) return null;
		rtc
			.getMyStream(LocalStreamConfig)
			.then((stream: MediaStream) => {
				rtc.startListeners();
				createVideoElement({
					id: name,
					stream,
					options: LocalVideoDimensions
				});
			})
			.catch((err: Error) => console.error(err.message));
	};

	const handleJoin = () => {
		if (name === '' || room === '') {
			return rtc.error('Requires name and room to continue.');
		}
		rtc.joinRoom(name, room);
	};

	const handleLeave = () => {
		rtc.leaveRoom(room);
		rtc.stopListeners();
		navigate('/');
	};

	return (
		<div className='main'>
			<h1>Conference: {room}</h1>

			<div className='controls'>
				<button onClick={handleStart}>Start</button>
				<button onClick={handleJoin}>Join</button>
				<button onClick={handleLeave}>Leave</button>
			</div>
			<div id='video-grid' />
		</div>
	);
}
