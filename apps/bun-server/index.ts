import { MsgParser } from "@fast-chat-js/ws-serialization";

const { parseMsg } = new MsgParser();

Bun.serve({
  fetch(req, server) {
    // upgrade the request to a WebSocket
    if (server.upgrade(req)) {
      return; // do not return a Response
    }
    return new Response("Upgrade failed :(", { status: 500 });
  },
  websocket: {
    message(ws, message) {
      const msg = parseMsg(message as Uint8Array);
    }, // a message is received
    open(ws) {
      ws.subscribe("main");
      // ws.publish("main", stringifyMsg();
    }, // a socket is opened
    close(ws) {}, // a socket is closed
    drain(ws) {}, // the socket is ready to receive more data
    perMessageDeflate: true,
  }, // handlers
});
