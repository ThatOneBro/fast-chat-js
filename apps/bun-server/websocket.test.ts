import { describe, it, expect, beforeAll } from "bun:test";
import {
  MsgDeserializer,
  getInt64BytesUnsafe,
} from "@fast-chat-js/ws-serialization";

import type { Server } from "bun";

describe("WebSocket", () => {
  let server: Server | undefined;
  beforeAll(() => {
    server = Bun.serve({
      fetch(req, server) {
        // upgrade the request to a WebSocket
        if (server.upgrade(req)) {
          return; // do not return a Response
        }
        return new Response("Upgrade failed :(", { status: 500 });
      },
      websocket: {
        message(ws, message) {
          if (ArrayBuffer.isView(message)) {
            ws.send(new Uint8Array([0, ...message]));
          }
          // const msg = parseMsg(message as Uint8Array);
        }, // a message is received
        open(ws) {
          ws.subscribe("main");
          ws.send("hello!!!");
          // ws.publish("main", stringifyMsg();
        }, // a socket is opened
        close(ws) {}, // a socket is closed
        drain(ws) {}, // the socket is ready to receive more data
        perMessageDeflate: true,
      }, // handlers
      port: 4200,
    });

    // Write tests for basic message cases
  });
  it("should allow us to connect to the server", (done) => {
    const ws = new WebSocket("http://localhost:4200");
    ws.addEventListener("open", () => {
      expect(true).toBe(true);
    });

    ws.addEventListener("message", (e) => {
      expect(e.data).toBe("hello!!!");
      done();
    });
  });

  it("should allow us to send Uint8Array", (done) => {
    const ws = new WebSocket("http://localhost:4200");

    let sent = false;
    ws.addEventListener("message", (e) => {
      if (!sent) {
        expect(e.data).toBe("hello!!!");
        ws.send(new Uint8Array([10, 12, 15, 18]));
        sent = true;
        return;
      }
      expect(new Uint8Array(e.data as ArrayBuffer)).toEqual(
        new Uint8Array([0, 10, 12, 15, 18]),
      );
      done();
    });
  });
});
