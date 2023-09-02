import type { MsgObj } from "@fast-chat-js/ws-serialization";
import { MsgDeserializer, MsgSerializer } from "@fast-chat-js/ws-serialization";
import { bench, group, run } from "mitata";

// Benchmark json vs current

const FIXTURES = [
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "mymomisdeadpermanently",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "gigachad",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo sanchez",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "john devito",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "mymomisdeadpermanently",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "gigachad",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo sanchez",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "john devito",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "mymomisdeadpermanently",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "gigachad",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo sanchez",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "john devito",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo",
      text: "hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "mymomisdeadpermanently",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "gigachad",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "pablo sanchez",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
  {
    type: "userText",
    timestamp: Date.now(),
    fields: {
      username: "john devito",
      text: "hello my name is danny, what is your name? hello my name is danny, what is your name?",
    },
  },
] satisfies MsgObj[];

const RUNS = 1000;
const serializer = new MsgSerializer();
const deserializer = new MsgDeserializer();

const jsonResults = new Array(RUNS);
const uint8Results = new Array(RUNS);

group("serialize", () => {
  bench("JSON.stringify()", () => {
    for (let i = 0; i < RUNS; i += 1) {
      jsonResults[i] = JSON.stringify(FIXTURES[i % FIXTURES.length]);
    }
  });

  bench("MsgSerializer.serializeMsgObj()", () => {
    for (let i = 0; i < RUNS; i += 1) {
      uint8Results[i] = serializer.serializeMsgObj(
        FIXTURES[i % FIXTURES.length],
      );
    }
  });
});

group("deserialize", () => {
  bench("MsgDeserializer.parseMsg()", () => {
    for (let i = 0; i < RUNS; i += 1) {
      const _deserialized = deserializer.parseMsg(uint8Results[i]);
    }
  });

  bench("JSON.parse()", () => {
    for (let i = 0; i < RUNS; i += 1) {
      const _deserialized = JSON.parse(jsonResults[i]);
    }
  });
});

await run();
