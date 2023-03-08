# React WebRTC Streaming Example

## What is this?
This repository will demonstrate the ways you can create a connection between browsers to stream audio/video content.
## What are the requirements?
Basic understanding of React..
## Events

### .on
created:
  1. Receives an event once the conference room is created
  2. Creates local peer connection and creates offer
  3. Signal service broadcasts that the stream is ready with offer
  4. Receiving peers will create a peer connection
     and add media stream.

joined:
  1.