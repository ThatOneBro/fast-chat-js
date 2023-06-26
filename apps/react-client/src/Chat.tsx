import { useEffect, useRef, useState } from "react";
import { MSG_TYPES, MsgDeserializer } from "@fast-chat-js/ws-serialization";
import type { MsgTypeName, MsgObj } from "@fast-chat-js/ws-serialization";

type UserText = {
  timestamp: number;
  username: string;
  text: string;
};

function ChatMessage({ timestamp, username, text }: UserText) {
  return (
    <span>
      [{timestamp}] {username}: {text}
    </span>
  );
}

// Virtualized...
// Get height of message...
// Calculate height of parent div...
// Fix X messages in the div

let msgDeserializer: MsgDeserializer | undefined;
let parseMsg: InstanceType<typeof MsgDeserializer>["parseMsg"] | undefined;

export default function Chat({ serverUrl }: { serverUrl: URL | string }) {
  const [messages, setMessages] = useState<MsgObj[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Establish WebSocket connection
    const ws = new WebSocket(serverUrl);

    ws.addEventListener("message", (e) => {
      msgDeserializer ??= new MsgDeserializer();
      parseMsg ??= msgDeserializer.parseMsg;
      const msgObj = parseMsg(e.data as Uint8Array);
      if ((msgObj.type as MsgTypeName) === MSG_TYPES[0])
        setMessages((s) => [...s, msgObj]);
    });

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [serverUrl]);

  return (
    <div>
      {messages.map(({ timestamp, fields: { username, text } }) => (
        <ChatMessage timestamp={timestamp} username={username} text={text} />
      ))}
    </div>
  );
}
