import { readFileSync, writeFileSync } from "node:fs";
import { get_encoding } from "tiktoken";
import z from "zod";

const EMBED_MAX_SIZE = 8150;
const encoding = get_encoding("cl100k_base");
export function getSize(text: string): number {
  return encoding.encode(text).length;
}

const OpenAIEmbeddingsResponse = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
    })
  ),
});

async function embedText(text: string): Promise<number[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not set in environment variables");
  }

  let text2 = text.replace(/\n/g, " ");
  let tokens = encoding.encode(text2);
  if (tokens.length > EMBED_MAX_SIZE) {
    tokens = tokens.slice(0, EMBED_MAX_SIZE);
    text2 = encoding.decode(tokens).toString();
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [text],
      model: "text-embedding-ada-002",
    }),
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status} ${response.statusText}`);
  }

  const data = OpenAIEmbeddingsResponse.parse(await response.json());
  return data.data[0].embedding;
}

export type VectorRecord = Record<string, [number[], string]>;
export class VectorStore {
  private cache: VectorRecord;
  private name: string;

  constructor(name: string, createIfNotExist = true) {
    this.name = name;
    try {
      this.cache = JSON.parse(readFileSync(this.name, "utf8"));
    } catch (e) {
      if (createIfNotExist) {
        this.cache = {};
      } else {
        throw e;
      }
    }
  }

  async addRecord(body: string, title: string, cacheOverride?: VectorRecord) {
    const cache = cacheOverride ?? this.cache;

    if (!(body in cache)) {
      // call embedding API
      this.cache[body] = [await embedText(body), title];
    } else if (!(body in this.cache)) {
      // in cache and not in this.cache: use cached item
      this.cache[body] = cache[body];
    }

    return this.cache[body];
  }

  async getSorted(query: string) {
    const q = await embedText(query);
    const buf: Array<[number, string, string]> = [];

    for (const [body, [v, title]] of Object.entries(this.cache)) {
      buf.push([this.dotProduct(q, v), body, title]);
    }

    buf.sort((a, b) => b[0] - a[0]);
    return buf;
  }

  save() {
    writeFileSync(this.name, JSON.stringify(this.cache, null), "utf8");
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, value, index) => sum + value * b[index], 0);
  }
}
