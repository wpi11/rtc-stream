const createVideoElement = ({ id, stream }: { id: any; stream: object }) => {
	const exists = document.getElementById(`vid_${id}`) as HTMLElement;

	if (!exists) {
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
	}
};

export { createVideoElement };
