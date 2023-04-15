import type { NextApiRequest, NextApiResponse } from "next";
import { SafeSearchType, search } from "duck-duck-scrape";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    const { q, count = 3 } = req.query;
    const searchResults = await search(q, {
      // safeSearch: SafeSearchType.STRICT,
    });
    res.status(200).json(searchResults.results.slice(0, parseInt(count)));
  }
};
