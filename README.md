# WebRTC Peer Connection Module

## Context

## What is this?

## What are the requirements?

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