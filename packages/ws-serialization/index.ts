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
  byteOffset: number = 0,
  littleEndian: boolean = true,
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
  byteOffset: number = 0,
  littleEndian: boolean = true,
) {
  return dataView.getUint16(byteOffset, littleEndian);
}

// export class BufferPool {
//   private _buffers: Buffer[] | undefined;
//   private _bytesToAllocate;
//   private _size = 0;
//   private _capacity: number;
//   constructor(bufferSize = 8, poolCapacity = 32) {
//     this._bytesToAllocate = bufferSize;
//     this._capacity = poolCapacity;
//   }

//   getBufferOrAlloc() {
//     let buf: Buffer | undefined;
//     if (this._size > 0) {
//       buf = (this._buffers as Buffer[]).pop() as Buffer;
//       this._size -= 1;
//     } else {
//       buf = Buffer.alloc(this._bytesToAllocate);
//     }
//     return buf;
//   }

//   free(buf: Buffer) {
//     if (this._size === this._capacity) return;
//     this._buffers ??= [];
//     this._buffers.push(buf);
//     this._size += 1;
//   }
// }

export function getInt64BytesUnsafe(x: bigint): Buffer {
  const bytes = Buffer.allocUnsafe(8);
  bytes.writeBigInt64LE(x);
  return bytes;
}

export function getUint16BytesUnsafe(x: number): Buffer {
  const bytes = Buffer.allocUnsafe(2);
  bytes.writeUint16LE(x);
  return bytes;
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
    if (!typeIdx) throw new Error("Invalid type!");
    if (typeof timestamp !== "number") throw new Error("Invalid timestamp!");

    // need to sort fields in the order they occur in...
    // compute length of type - 1 byte
    // timestamp -- 64 bits / 8 = 8 bytes
    // len -- 1 byte
  }
}
