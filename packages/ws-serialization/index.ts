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

export const MSG_TYPES = [
  "userText",
  "systemUserJoinedRoom",
  "systemUserLeftRoom",
  "systemUserAddedToRoom",
  "systemUserRemovedFromRoom",
  "systemUserBanned",
] as const;

export const VALID_FIELD_NAMES = [
  "username",
  "text",
  "roomId",
  "reasonMsg",
  "banLengthInMins",
] as const;

export const VALID_FIELDS = {
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

export const MSG_FIELDS = [
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

export const MSG_FIELD_TYPES = [
  ["string", "string"],
  ["string", "string"],
  ["string", "string"],
  ["string", "string"],
  ["string", "string", "string", "string"],
  ["string", "string", "string", "number"],
] as const;

export type MsgTypeName = (typeof MSG_TYPES)[number];
type MsgTypeIdxPreFiltered = keyof typeof MSG_TYPES;
type FilterNumbers<T extends PropertyKey> = T extends `${number}` ? T : never;
type MsgTypeIdx = FilterNumbers<MsgTypeIdxPreFiltered>;

// Do we even need to parse this?
export type MsgObj = {
  type: MsgTypeName[MsgTypeIdx];
  timestamp: number;
  fields: Partial<ValidMsgFields>;
};

// msg field 0 is always system timestamp
// Structure of the msg
// 0th byte: type of msg
// 1 - 8: timestamp
// 9 - n: fields structured as [..., bytes_for_field, field, until, bytes_for_field, ...]

export function getUint64(
  dataView: DataView,
  byteOffset = 0,
  littleEndian = true,
) {
  // split 64-bit number into two 32-bit (4-byte) parts
  const left = dataView.getUint32(byteOffset, littleEndian);
  const right = dataView.getUint32(byteOffset + 4, littleEndian);

  // combine the two 32-bit values
  const combined = littleEndian
    ? left + 2 ** 32 * right
    : 2 ** 32 * left + right;

  if (!Number.isSafeInteger(combined))
    console.warn(combined, "exceeds MAX_SAFE_INTEGER. Precision may be lost");

  return combined;
}

export function getUint16(
  dataView: DataView,
  byteOffset = 0,
  littleEndian = true,
) {
  return dataView.getUint16(byteOffset, littleEndian);
}

export function setBigUint64(
  dataView: DataView,
  value: bigint,
  byteOffset = 0,
  littleEndian = true,
) {
  return dataView.setBigUint64(byteOffset, value, littleEndian);
}

export function setUint16(
  dataView: DataView,
  value: number,
  byteOffset = 0,
  littleEndian = true,
) {
  return dataView.setUint16(byteOffset, value, littleEndian);
}

export function getUint64BytesUnsafe(x: bigint): Uint8Array {
  const bytes = new ArrayBuffer(8);
  const view = new BigUint64Array(bytes);
  view[0] = x;
  return new Uint8Array(bytes);
}

export function getUint16BytesUnsafe(x: number): Uint8Array {
  const bytes = new ArrayBuffer(2);
  const view = new Uint16Array(bytes);
  view[0] = x;
  return new Uint8Array(bytes);
}

export function encodeIntoAtOffset(
  encoder: TextEncoder,
  str: string,
  byteArr: Uint8Array,
  byteOffset = 0,
) {
  return encoder.encodeInto(
    str,
    byteOffset ? byteArr.subarray(byteOffset) : byteArr,
  );
}

export class MsgDeserializer {
  private _textDecoder: TextDecoder | undefined;

  parseMsg(msg: Uint8Array): MsgObj {
    // get type
    const type = msg[0];
    const typeName = MSG_TYPES[type];
    const fieldNames = MSG_FIELDS[type];
    const fieldTypes = MSG_FIELD_TYPES[type];

    // Validate timestamp is within acceptable range
    // If not, replace timestamp
    const dataView = new DataView(msg.buffer);
    const msgObj = {
      type: typeName,
      timestamp: getUint64(dataView, 1, true),
      fields: {},
    } as MsgObj;

    let currField = 0;
    let currIndex = 9;
    while (currField < fieldTypes.length) {
      const fieldValueLen = getUint16(dataView, currIndex, true); // we want 2 bytes so we can have a uint16
      currIndex += 2;

      const rawVal = msg.subarray(currIndex, currIndex + fieldValueLen);

      let fieldValue;
      switch (fieldTypes[currField]) {
        case "string":
          this._textDecoder ??= new TextDecoder();
          fieldValue = this._textDecoder.decode(rawVal);
          break;
        case "number":
          fieldValue = rawVal[0];
          break;
        default:
          throw new Error("Broken");
      }

      const fieldName = fieldNames[currField];
      msgObj.fields[fieldName] = fieldValue;

      currField += 1;
      currIndex += fieldValueLen;
    }

    return msgObj;
  }
}

export class MsgSerializer {
  private _textEncoder: TextEncoder | undefined;

  serializeMsgObj(msgObj: MsgObj): Uint8Array {
    const { type, timestamp, fields } = msgObj;
    // read type of message, encode its index in MSG_TYPES as number
    const typeIdx = MSG_TYPES.indexOf(type as MsgTypeName);
    if (typeIdx < 0) throw new Error("Invalid type!");
    if (typeof timestamp !== "number") throw new Error("Invalid timestamp!");

    // PERF: Is it faster to do this once and just concat the buffers, or find the len first faster?
    let bufLen = 9; // 1 + 8, type byte + 8 bytes for timestamp
    for (let i = 0; i < MSG_FIELDS[typeIdx].length; i += 1) {
      bufLen += fields[MSG_FIELDS[typeIdx][i]].length + 2;
    }
    const msgBuf = new Uint8Array(bufLen);
    const dataView = new DataView(msgBuf.buffer);
    msgBuf[0] = typeIdx;
    setBigUint64(dataView, BigInt(timestamp), 1);

    let currPos = 9;
    // need to sort fields in the order they occur in...
    for (let i = 0; i < MSG_FIELDS[typeIdx].length; i += 1) {
      const fieldVal = fields[MSG_FIELDS[typeIdx][i]];
      const fieldLen = fieldVal.length;
      // Set the length of the field
      setUint16(dataView, fieldLen, currPos);
      currPos += 2;

      // TODO: validate field type works for this field
      const fieldType = MSG_FIELD_TYPES[typeIdx][i];
      switch (fieldType) {
        case "string": {
          const encoder = (this._textEncoder ??= new TextEncoder());
          encodeIntoAtOffset(encoder, fieldVal, msgBuf, currPos);
          currPos += fieldLen;
          break;
        }
        case "number":
          // TODO: Support numbers larger than 8 bits
          msgBuf[currPos] = fieldVal;
          currPos += 1;
          break;
        default:
          throw new Error("Broken!");
      }
    }
    return msgBuf;
  }
}
