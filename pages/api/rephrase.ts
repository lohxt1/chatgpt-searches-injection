import type { NextApiRequest, NextApiResponse } from "next";
import openai from "@/lib/openai";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const { toRephraseString } = JSON.parse(req.body);
    const _result = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: toRephraseString,
      max_tokens: 1000,
      temperature: 0,
    });
    res.status(200).json({ text: _result?.data?.choices?.[0]?.text });
  }
};
