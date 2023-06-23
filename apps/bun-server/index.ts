// Server keeps a list of clients
// When a client joins, it is added to specific room
// When a new client is added to a room, client will begin to receive messages

// Message types:
// System messages --
// - x user joined room
// - x user left room
// - this user has been added to a room
// - this user has been removed from a room (w/ reason)
// - this user has been banned from this server (w/ length of ban)

// User messages -- messages sent by user
// - text messages -- freeform text

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
    timestamp: Number(msg.subarray(1, 9)),
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
        fieldValue = String(rawVal);
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
    currIndex += fieldValueLen + 1;
  }

  return msgObj;
}

function stringifyMsg(msgObj: MsgObj) {}

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

// Write tests for basic message cases
