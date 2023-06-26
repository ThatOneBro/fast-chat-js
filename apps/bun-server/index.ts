import { MsgSerializer } from "@fast-chat-js/ws-serialization";

// let msgDeserializer: MsgDeserializer | undefined;
let msgSerializer: MsgSerializer | undefined;

// let parseMsg: InstanceType<typeof MsgDeserializer>["parseMsg"] | undefined;
let serializeMsgObj:
  | InstanceType<typeof MsgSerializer>["serializeMsgObj"]
  | undefined;

Bun.serve<{ username: string }>({
  fetch(req, server) {
    // upgrade the request to a WebSocket
    if (
      server.upgrade(req, {
        data: {
          username: new URL(req.url).searchParams.get("username"),
        },
      })
    ) {
      return; // do not return a Response
    }
    return new Response("Upgrade failed :(", { status: 500 });
  },
  websocket: {
    message(ws, message) {
      // if msgType === 0 (userText)
      // broadcast message to room
      if (message[0] === 0) {
        ws.publishBinary("main", message as Uint8Array);
      }
    }, // a message is received
    open(ws) {
      ws.subscribe("main");
      serializeMsgObj ??= (msgSerializer ??= new MsgSerializer())
        .serializeMsgObj;
      ws.publishBinary(
        "main",
        serializeMsgObj({
          type: "systemUserAddedToRoom",
          timestamp: Date.now(),
          fields: { username: ws.data.username },
        }),
      );
      // ws.publish("main", stringifyMsg();
    }, // a socket is opened
    close(ws) {}, // a socket is closed
    drain(ws) {}, // the socket is ready to receive more data
    perMessageDeflate: true,
  }, // handlers
});
