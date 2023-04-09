export const removeVideoElement = ({ id }: { id: string | undefined }) => {
  const videoEl = document.getElementById(`vid_${id}`);
  videoEl?.remove();
};
