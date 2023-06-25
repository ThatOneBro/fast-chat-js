import { describe, it, expect, beforeAll } from "bun:test";
import {
  MsgDeserializer,
  getInt64BytesUnsafe,
  MSG_TYPES,
  getUint16BytesUnsafe,
  MsgSerializer,
} from ".";

import type { MsgObj } from ".";

describe("MsgDeserializer", () => {
  let textEncoder: TextEncoder;

  beforeAll(() => {
    textEncoder = new TextEncoder();
  });

  describe("parseMsg", () => {
    let deserializer: MsgDeserializer;
    beforeAll(() => {
      deserializer = new MsgDeserializer();
    });

    it("should parse a valid message", () => {
      const username = "John";
      const textMsg = "Hello, world!";

      const bytes = new Uint8Array([
        0,
        ...getInt64BytesUnsafe(BigInt(Date.now())),
        ...getUint16BytesUnsafe(username.length),
        // username.length & 0xff,
        // (username.length >> 8) & 0xff,
        ...textEncoder.encode(username),
        ...getUint16BytesUnsafe(textMsg.length),
        // textMsg.length & 0xff,
        // (textMsg.length >> 8) & 0xff,
        ...textEncoder.encode(textMsg),
      ]);

      const msgObj = deserializer.parseMsg(bytes);

      expect(typeof msgObj).toEqual("object");
      expect(msgObj.type).toEqual(MSG_TYPES[0]);
      expect(msgObj.timestamp).toBeNumber();
      expect(typeof msgObj.fields).toEqual("object");
      expect(msgObj.fields.username).toEqual("John");
      expect(msgObj.fields.text).toEqual("Hello, world!");
    });
  });

  // describe("serializeMsgObj", () => {
  //   let serializer: MsgSerializer;
  //   beforeAll(() => {
  //     serializer = new MsgSerializer();
  //   });

  //   it("should serialize a valid message object", () => {
  //     const username = "John";
  //     const textMsg = "Hello, world!";
  //     const dateNow = Date.now();

  //     const msgObj = {
  //       type: "userText",
  //       timestamp: dateNow,
  //       fields: {
  //         username,
  //         text: textMsg,
  //       },
  //     } as MsgObj;

  //     const msgAsBytes = new Uint8Array([
  //       0,
  //       ...getInt64BytesUnsafe(BigInt(dateNow)),
  //       ...getUint16BytesUnsafe(username.length),
  //       ...textEncoder.encode(username),
  //       ...getUint16BytesUnsafe(textMsg.length),
  //       ...textEncoder.encode(textMsg),
  //     ]);

  //     expect(serializer.serializeMsgObj(msgObj)).toEqual(msgAsBytes);
  //   });
  // });
});
