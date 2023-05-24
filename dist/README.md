# React Video Stream powered by Web RTC

## What is this?

This repository was created to simplify the implementation of WebRTC (Web Real-Time Communication). WebRTC is a powerful technology that enables real-time audio, video, and data communication directly between web browsers or other compatible devices. However, implementing WebRTC can be challenging due to its complex nature.

Providing a module that serves as an abstraction layer, effectively shields developers from the intricacies and difficulties associated with implementing WebRTC. By leveraging this package, developers can focus on the core functionality of their applications without having to delve deeply into the low-level details of WebRTC.

## What are the requirements?

1. Node.js and npm installed
2. React development environment with the following packages installed:
   1.
3. Installation of npm package: `@teamwayne/wrtc-stream`

## Connection Flow

1. Host: creates / joins room
2. ...

## Signaling

- Stream

### `created` event

1. Fires on room creation.
2. Creates local peer connection and creates offer.
3. Signal service broadcasts that the stream is ready.
4. Receiving peers will create a peer connection and add media stream.

### `joined` event

- TBD

### `stream` event

- TBD

### `leave` event

- TBD

### `error` event

- TBD

### Docker

Docker is leveraged to containerize this application
Details in route..
Notes TODO: Build, Tag, Push