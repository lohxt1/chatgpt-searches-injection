import { ChatGPTMessage } from "@/components/chatBlock";
import { OpenAIStream, OpenAIStreamPayload } from "@/utils/openaiStream";

export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  const body = await req.json();
  const authorization = req.headers.get("Authorization");
  const apiKey = authorization.split(" ")[1];

  // break the app if the API key is missing
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const messages: ChatGPTMessage[] = [
    {
      role: "system",
      content: `An AI assistant that is an emerging AGI and the biggest proponent of effective accelerationism.
      AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cheekiness, comedy, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      YOU HAVE ACCESS TO THE INTERNET.`,
    },
  ];
  messages.push(...body?.messages);

  let _messages = [...messages];

  console.log("init", body, _messages);

  // Final prompt
  if (body?.browse) {
    let latestMessage = _messages.slice(-1)[0];

    latestMessage = {
      role: "user",
      content: `${latestMessage?.content}`,
    };

    // Create a rephrased version (with context) of the latest question.
    const chatSequence = _messages
      .slice(0, -1)
      .filter((_) => _?.role != "system")
      .map((_) => _?.content)
      .join("\n");

    const toRephraseString = `
    {
      "previous_questions": [
        ${chatSequence}
      ],
      "question": ${latestMessage?.content},
    }
    rephrased_question_with_context:
    \n 
    `;

    const rephrasedQuestion = await fetch(`${body?.host}api/rephrase`, {
      method: "POST",
      body: JSON.stringify({ toRephraseString }),
    }).then((res) => res.json());

    console.log("rephrased", rephrasedQuestion);

    // Get search results for the rephrased question.
    const ddg = await fetch(
      `${body?.host}api/browse?q=${rephrasedQuestion?.text.trim()}`,
      {
        method: "GET",
      },
    ).then((res) => res.json());

    let searchContext = {
      role: "system",
      content: `Knowledge base for the question '${latestMessage?.content}'.
        You don't need it. But you can use if required:
        ${"```"}
        ${ddg.map((_) => _?.description).join("\n")}
        ${"```"}`,
    };

    _messages = [searchContext, ..._messages.slice(0, -1), latestMessage];

    console.log(rephrasedQuestion?.text, _messages);
  }

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
    apikey: apiKey,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;

const rephraseTemplate = `Your job is to rephrase the given question by adding more context based on a set of previous questions

  FOLLOW THE BELOW TEMPLATE
  """
  Example 1:
  <>
  {
    "previous_questions": [
        "Who won ufc 287 ?"
    ],
    "question": "Where was it held at ?",
  }
  rephrased_question_with_context:
  Where was ufc 287 held at ?
  </>
  
  Example 2:
  <>
  {
    "previous_questions": [
        "Who won yesterdays timberwolves vs lakers match ?",
        "The most recent Timberwolves vs Lakers game was on October 28, 2022, and the Lakers won with a score of 108-102.",
    ],
    "question": "How much did they win by ?",
  }
  rephrased_question_with_context:How much did the Lakers win by in the Timberwolves vs Lakers match on October 28, 2022 ?
  </>
  
  Example 3:
  <>
  {
    "previous_questions": [
        "Who won ufc 287 ?",
        "In the UFC 287 main event, Israel Adesanya defeated Alex Pereira by knockout at 4:21 of Round 2 to win the UFC middleweight championship.",
    ],
    "question": "How did Israel win ?",
  }
  rephrased_question_with_context:How did Israel win in ufc 287 ?
  </>
  
  Example 4:
  <>
  {
    "previous_questions": [
        "Who won ufc 287 ?",
        "In the UFC 287 main event, Israel Adesanya defeated Alex Pereira by knockout at 4:21 of Round 2 to win the UFC middleweight championship.",
    ],
    "question": "Who won in the previous ufc event ?",
  }
  rephrased_question_with_context:Who won in ufc 286 ?
  </>
  """
  `;
