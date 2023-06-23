# fast-chat-js

This is part of a larger project to make a fast WebSockets based chat protocol. 
This repo will contain both a client and a server implementation in TS so that code can be shared between client and server for message serialization logic.
After a working and tested client / server example exists in this repo, another backend implementation will be done in Golang and perhaps one will be done in Rust as well.

The goal of this chat engine is to be platform-agnostic, so that clients and servers should be able to communicate as long as they are both on platforms that support WebSockets,
and to be extendable with a performance-first, DX close-second (usually) plugin API. The idea is to create a very performant and efficient WebSockets based chat that could power
something like a Twitch chat, while simultaneously allowing it to be within reach of an average developer with a little domain knowledge around realtime chatrooms.

* WARNING: This repo is under heavy construction... *
