import { useEffect, useRef, useState } from "react";
import { useHistoryStore } from "stores/history";
import { useKeyStore } from "stores/key";
import { cn } from "@/utils/tailwind";
import { ChatBlock, type ChatGPTMessage } from "./chatBlock";

export function Chat() {
  const [loading, setLoading] = useState(false);

  const { apikey } = useKeyStore();
  const {
    setCurrentChatId,
    messages,
    setHistory,
    currentChatId,
    toggleBrowse,
    browse,
  } = useHistoryStore();

  useEffect(() => {
    // Initiate new chat
    setCurrentChatId();
  }, []);

  // send message to API /api/chat endpoint
  const sendMessage = async (message: string, index?: number) => {
    setLoading(true);

    // if a previous message is edited and submitted, ignore all the following messages.
    let _index = index >= 0 ? index : 1000;
    let _messages = messages.slice(0, _index);

    // append the new/edited message to the list of messages
    const newMessages = [
      ..._messages,
      { role: "user", content: message } as ChatGPTMessage,
    ];

    // update the store
    setHistory(newMessages);

    // last 10 messages will be sent for context
    const last10messages = newMessages.slice(-10);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey ?? ""}`,
      },
      body: JSON.stringify({
        messages: last10messages,
        browse,
        host: window.location.href,
        chatId: currentChatId,
      }),
    });

    console.log("Edge function returned.");

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    // This data is a ReadableStream
    const data = response.body;
    if (!data) {
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    let lastMessage = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);

      lastMessage = lastMessage + chunkValue;

      let _messages = [
        ...newMessages,
        { role: "assistant", content: lastMessage } as ChatGPTMessage,
      ];

      // update the store
      setHistory(_messages);

      // reset loading status
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full max-w-full flex-1 flex-col items-center justify-center">
      <div className="relative h-full w-full max-w-[700px]">
        <div className="relative h-full overflow-scroll">
          {messages.map(({ content, role }, index) => (
            <ChatBlock
              key={index}
              role={role}
              content={content}
              sendMessage={sendMessage}
              index={index}
            />
          ))}
          {loading && <LoadingChatLine />}
          {messages.length < 1 && (
            <div className="justify-content align-center clear-both m-auto flex h-[calc(100%_-_6.5rem)] w-full flex-grow items-center justify-center text-gray-300 dark:text-gray-700">
              Type a message to start the conversation
            </div>
          )}
          <div className="h-18 relative flex w-full md:h-24"></div>
          <ScrollToBlock loading={loading} messages={messages} />
        </div>
        <div className="align-center h-18 absolute bottom-0 left-0 flex w-full items-center justify-center border-t border-gray-100 bg-white pt-2 dark:border-gray-900 dark:bg-black md:h-24">
          <InputMessage
            sendMessage={sendMessage}
            browse={browse}
            toggleBrowse={toggleBrowse}
          />
        </div>
      </div>
    </div>
  );
}

// loading placeholder animation for the chat line
const LoadingChatLine = () => (
  <div
    className={
      "relative float-left clear-both w-full animate-pulse border-b border-gray-100 px-2 dark:border-gray-900"
    }
  >
    <div className="mb-5 flex w-full flex-row flex-wrap py-2">
      <div className="flex w-full flex-row">
        <p className="font-large text-xxl mr-2 text-gray-900 dark:text-gray-100">
          <div className="align-center flex h-6 w-6 items-center justify-center rounded-sm border border-gray-300 text-center text-xs">
            AI
          </div>
        </p>
        <div className="w-full space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 h-2 rounded bg-zinc-500"></div>
            <div className="col-span-1 h-2 rounded bg-zinc-500"></div>
          </div>
          <div className="h-2 rounded bg-zinc-500"></div>
        </div>
      </div>
    </div>
  </div>
);

const ScrollToBlock = (props) => {
  const { loading, messages } = props;
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    ref.current.scrollIntoView({ behavior: "smooth" });
  }, [loading, messages]);

  return <div className="relative flex h-[1px] w-full" ref={ref}></div>;
};

const InputMessage = ({ sendMessage, browse, toggleBrowse }: any) => {
  const [input, setInput] = useState("");

  return (
    <div className="clear-both mb-2 flex w-full md:mb-0 md:mt-6">
      <textarea
        aria-label="chat input"
        required
        placeholder="Send a message..."
        className="ml-2 h-[32px] min-w-0 flex-auto appearance-none border border-gray-200 bg-white px-3 py-[calc(theme(spacing.2)-1px)] shadow-md shadow-zinc-800/5 placeholder:text-zinc-400 focus:outline-none dark:border-gray-900 dark:border-gray-900 dark:bg-black sm:text-sm"
        value={input}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && input.length > 0) {
            sendMessage(input.trimStart());
            setInput("");
          }
        }}
        onChange={(e) => {
          setInput(e.target.value);
        }}
      />
      <button
        className="mx-2 flex-none"
        onClick={() => {
          toggleBrowse();
        }}
      >
        <World browse={browse} />
      </button>
      <button
        type="submit"
        className="mx-2 flex-none"
        disabled={input.length <= 0}
        onClick={() => {
          if (input.length <= 0) return;
          sendMessage(input.trimStart());
          setInput("");
        }}
      >
        →
      </button>
    </div>
  );
};

const World = ({ browse }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="-0.06 -0.06 0.72 0.72"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M.068.24A.24.24 0 0 0 .06.3c0 .021.003.041.008.06h.085a.595.595 0 0 1 0-.12H.068zM.093.18h.07A.349.349 0 0 1 .197.084.241.241 0 0 0 .092.18zm.44.06H.447a.595.595 0 0 1 0 .12h.085a.241.241 0 0 0 0-.12zM.508.18A.241.241 0 0 0 .404.084.4.4 0 0 1 .438.18h.07zM.213.24A.533.533 0 0 0 .21.3c0 .021.001.041.003.06h.173a.533.533 0 0 0 0-.12H.213zM.224.18h.152A.323.323 0 0 0 .353.115C.334.077.313.06.3.06.287.06.266.077.248.115A.353.353 0 0 0 .225.18zM.092.42a.241.241 0 0 0 .104.096A.4.4 0 0 1 .162.42h-.07zm.416 0h-.07a.349.349 0 0 1-.034.096A.241.241 0 0 0 .508.42zm-.284 0a.353.353 0 0 0 .023.065C.266.523.287.54.3.54.313.54.334.523.352.485A.353.353 0 0 0 .375.42H.224zM.3.6a.3.3 0 1 1 0-.6.3.3 0 0 1 0 .6z"
        className={cn(browse ? "fill-[#00f]" : "fill-[#333]")}
      />
    </svg>
  );
};
