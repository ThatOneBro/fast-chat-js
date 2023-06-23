import { describe, it, expect, beforeAll } from "bun:test";
import { Buffer } from "node:buffer";

const MSG_TYPES = [
  "userText",
  "systemUserJoinedRoom",
  "systemUserLeftRoom",
  "systemUserAddedToRoom",
  "systemUserRemovedFromRoom",
  "systemUserBanned",
] as const;

const VALID_FIELD_NAMES = [
  "username",
  "text",
  "roomId",
  "reasonMsg",
  "banLengthInMins",
] as const;

const VALID_FIELDS = {
  USERNAME: VALID_FIELD_NAMES[0],
  TEXT: VALID_FIELD_NAMES[1],
  ROOM_ID: VALID_FIELD_NAMES[2],
  REASON_MSG: VALID_FIELD_NAMES[3],
  BAN_LENGTH_IN_MINS: VALID_FIELD_NAMES[4],
} as const;

type ValidField = (typeof VALID_FIELDS)[keyof typeof VALID_FIELDS];
type TupleToObject<T extends readonly string[]> = {
  [P in T[number]]: any;
};

type ValidMsgFields = TupleToObject<typeof VALID_FIELD_NAMES>;

const MSG_FIELDS = [
  [VALID_FIELDS.USERNAME, VALID_FIELDS.TEXT], // userText
  [VALID_FIELDS.USERNAME, VALID_FIELDS.ROOM_ID], // systemUserJoinedRoom
  [VALID_FIELDS.USERNAME, VALID_FIELDS.ROOM_ID], // systemUserLeftRoom
  [VALID_FIELDS.USERNAME, VALID_FIELDS.ROOM_ID], // systemUserAddedToRoom
  [VALID_FIELDS.USERNAME, VALID_FIELDS.ROOM_ID, VALID_FIELDS.REASON_MSG], // systemUserRemovedFromRoom
  [
    VALID_FIELDS.USERNAME,
    VALID_FIELDS.ROOM_ID,
    VALID_FIELDS.REASON_MSG,
    VALID_FIELDS.BAN_LENGTH_IN_MINS,
  ], // systemUserBanned
] as const;

const MSG_FIELD_TYPES = [
  ["string", "string"],
  ["string", "string"],
  ["string", "string"],
  ["string", "string"],
  ["string", "string", "string", "string"],
  ["string", "string", "string", "number"],
] as const;

type MsgTypeName = (typeof MSG_TYPES)[number];
type MsgTypeIdxPreFiltered = keyof typeof MSG_TYPES;
type FilterNumbers<T extends PropertyKey> = T extends `${number}` ? T : never;
type MsgTypeIdx = FilterNumbers<MsgTypeIdxPreFiltered>;

// Do we even need to parse this?
type MsgObj = {
  type: MsgTypeName[MsgTypeIdx];
  timestamp: number;
  fields: Partial<ValidMsgFields>;
};

// msg field 0 is always system timestamp
// Structure of the msg
// 0th byte: type of msg
// 1 - 8: timestamp
// 9 - n: fields structured as [..., bytes_for_field, field, until, bytes_for_field, ...]

function getUint64(
  dataview: DataView,
  byteOffset: number,
  littleEndian: boolean
) {
  // split 64-bit number into two 32-bit (4-byte) parts
  const left = dataview.getUint32(byteOffset, littleEndian);
  const right = dataview.getUint32(byteOffset + 4, littleEndian);

  // combine the two 32-bit values
  const combined = littleEndian
    ? left + 2 ** 32 * right
    : 2 ** 32 * left + right;

  if (!Number.isSafeInteger(combined))
    console.warn(combined, "exceeds MAX_SAFE_INTEGER. Precision may be lost");

  return combined;
}

let textDecoder;
function parseMsg(msg: Uint8Array): MsgObj {
  // get type
  const type = msg[0];
  const typeName = MSG_TYPES[type];
  const fieldNames = MSG_FIELDS[type];
  const fieldTypes = MSG_FIELD_TYPES[type];

  // Validate timestamp is within acceptable range
  // If not, replace timestamp
  const msgObj = {
    type: typeName,
    timestamp: getUint64(new DataView(msg.buffer), 1, true),
    fields: {},
  } as MsgObj;

  let currField = 0;
  let currIndex = 9;
  while (currField < fieldTypes.length) {
    const fieldValueLen = msg[currIndex];
    currIndex += 1;

    const rawVal = msg.subarray(currIndex, currIndex + fieldValueLen);

    let fieldValue;
    switch (fieldTypes[currField]) {
      case "string":
        textDecoder ??= new TextDecoder();
        fieldValue = textDecoder.decode(rawVal);
        break;
      case "number":
        fieldValue = rawVal[0];
        break;
      default:
        throw new Error("Broken");
    }

    const fieldName = fieldNames[currField] as ValidField;
    msgObj.fields[fieldName] = fieldValue;

    currField += 1;
    currIndex += fieldValueLen;
  }

  return msgObj;
}

function getInt64Bytes(x: bigint): Buffer {
  const bytes = Buffer.alloc(8);
  bytes.writeBigInt64LE(x);
  return bytes;
}

describe("parseMessage", () => {
  it("should parse a valid message", () => {
    const textEncoder = new TextEncoder();
    const username = "John";
    const textMsg = "Hello, world!";

    const bytes = new Uint8Array([
      0,
      ...getInt64Bytes(BigInt(Date.now())),
      username.length,
      ...textEncoder.encode(username),
      textMsg.length,
      ...textEncoder.encode(textMsg),
    ]);

    const msgObj = parseMsg(bytes);

    expect(typeof msgObj).toEqual("object");
    expect(msgObj.type).toEqual(MSG_TYPES[0]);
    expect(msgObj.timestamp).toBeNumber();
    expect(typeof msgObj.fields).toEqual("object");
    expect(msgObj.fields.username).toEqual("John");
    expect(msgObj.fields.text).toEqual("Hello, world!");
  });
});

describe("WebSocket", () => {
  let server;
  beforeAll(() => {
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
        new Uint8Array([0, 10, 12, 15, 18])
      );
      done();
    });
  });
});
