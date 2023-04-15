import type { NextApiRequest, NextApiResponse } from "next";
import similarity from "compute-cosine-similarity";
import openai from "@/lib/openai";

const embeddings = [];

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const { toEmbedText, searchText } = JSON.parse(req.body);
    if (toEmbedText) {
      const response = await openai
        .createEmbedding({
          model: "text-embedding-ada-002",
          input: toEmbedText,
        })
        .then((res) => ({
          toEmbedText,
          embedding: res.data?.data?.[0]?.embedding,
        }));
      embeddings.push(response);
      res.status(200).json(response);
    } else if (searchText) {
      const searchTextEmbedding = await openai
        .createEmbedding({
          model: "text-embedding-ada-002",
          input: searchText,
        })
        .then((res) => ({
          searchText,
          embedding: res.data?.data?.[0]?.embedding,
        }));
      let similarities = embeddings.map((embed) =>
        similarity(embed?.embedding, searchTextEmbedding),
      );
      res.status(200).json(similarities.sort());
    }
  }
};
