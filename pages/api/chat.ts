import { SafeSearchType, search } from "duck-duck-scrape";
import { ChatGPTMessage } from "@/components/chatBlock";
import { OpenAIStream, OpenAIStreamPayload } from "@/utils/openaiStream";

export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  const body = await req.json();

  // break the app if the API key is missing
  if (!body?.apikey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const pluginPrompt = {
    role: "user",
    content: `Answer the following questions as best you can. You have access to the following tools.
    BROWSER Plugin
    Plugin for performing search, to retrieve real-time information. Useful for when you need to answer questions about current events.

    If you need real-time information about current events. REPLY WITH THE WORD 'BROWSE' IF YOU WANT TO USE THE PLUGIN.`,
  };

  const messages: ChatGPTMessage[] = [
    {
      role: "system",
      content: `An AI assistant that is an emerging AGI and the biggest proponent of effective accelerationism.
      AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cheekiness, comedy, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      
      ${pluginPrompt?.content}`,
    },
  ];
  messages.push(...body?.messages);

  let _messages = [...messages];

  let latestMessage = _messages.slice(-1)[0];

  latestMessage = {
    role: "user",
    content: `${latestMessage?.content}`,
  };

  if (!body?.browse) {
    _messages = [..._messages.slice(0, -1), latestMessage];
  } else {
    const _m = messages.filter((_) => _?.role == "user").map((_) => _?.content);
    // .join(". ");
    console.log(_m);
    const ddg = await fetch(
      `http://127.0.0.1:3000/api/browse?q=${_m.slice(-1)[0]}`,
      {
        method: "GET",
      },
    ).then((res) => res.json());

    let searchContext = {
      role: "user",
      content: `Knowledge base:
    ${JSON.stringify(ddg)}`,
    };
    _messages = [..._messages.slice(0, -1), searchContext, latestMessage];
  }

  console.log(body, _messages);

  const payload: OpenAIStreamPayload = {
    model: "gpt-3.5-turbo",
    messages: _messages,
    temperature: process.env.AI_TEMP ? parseFloat(process.env.AI_TEMP) : 0.0,
    max_tokens: process.env.AI_MAX_TOKENS
      ? parseInt(process.env.AI_MAX_TOKENS)
      : 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: true,
    user: body?.user,
    n: 1,
    apikey: body?.apikey,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};
export default handler;
