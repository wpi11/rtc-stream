type VideoElement = {
  height: number;
  width: number;
};
interface CreateVideoElement {
  id: string;
  stream: MediaStream;
  options?: VideoElement;
}

const createVideoElement = ({ id, stream, options }: CreateVideoElement) => {
  const videoGrid = document.getElementById("video-grid");
  const exists = document.getElementById(`vid_${id}`) as HTMLElement;

  if (!videoGrid) {
    throw new Error("Video grid with id `video-grid` is required.");
  }

  if (!exists) {
    (window as any).stream = stream;
    const videoEl = document.createElement("video");
    videoEl.id = `vid_${id}`;
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.style.height = `${options?.height}px`;
    videoEl.style.width = `${options?.width}px`;
    videoEl.style.borderRadius = "10px";
    videoEl.style.boxShadow = "50px";
    videoEl.style.margin = "10px";
    videoEl.style.objectFit = "cover";
    videoEl.controls = true;
    videoGrid?.appendChild(videoEl);
  }
};

export { createVideoElement };
