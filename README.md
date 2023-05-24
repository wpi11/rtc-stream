# WebRTC Stream (Doc WIP)

## What is this?

This repository was created to simplify the implementation of WebRTC (Web Real-Time Communication). WebRTC is a powerful technology that enables real-time audio, video, and data communication directly between web browsers or other compatible devices. However, implementing WebRTC can be challenging due to its complex nature.

Providing a module that serves as an abstraction layer, effectively shields developers from the intricacies and difficulties associated with implementing WebRTC. By leveraging this package, developers can focus on the core functionality of their applications without having to delve deeply into the low-level details of WebRTC.

## What are the requirements?

1. Node.js and npm installed
2. Installation of npm packages:
   1. socket.io (server)
   2. socket.io-client (client)
3. Development environment:
   1. Backend server with `socket.io` connection
   2. Frontend client with `socket.io-client` connection

## Connection Flow

1. Host: creates / joins room
2. ...

## Signaling

- WIP

## Events
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

## Docker
The Dockerization of this package is WIP.
- TODO: Build, Tag, Push