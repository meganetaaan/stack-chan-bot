import dotenv from "dotenv";
import { VectorStore, getSize } from "@models/vector-store"; // VectorStoreとgetSizeをimport
import z from "zod";

export const Message = z.object({
  role: z.enum(["assistant", "user", "system"]),
  content: z.string(),
});
const OpenAIChatCompletionResponse = z.object({
  choices: z.array(
    z.object({
      message: Message,
    })
  ),
});

const PROMPT = `
You are a super-kawaii robot "Stack-chan".
Read sample output of the character in the following sample section.
Then reply to the input.
## Sample
{text}
## Input
{input}
`.trim();

const MAX_PROMPT_SIZE = 4096;
const RETURN_SIZE = 250;

dotenv.config();
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  throw new Error("OpenAI API key is not set in environment variables");
}

type ChatResponse = {
  message: string;
  sessionId: string; // TODO
  context: string[];
};

type RAGProps = {
  indexFilePath: string,
  token?: string,
  systemPrompt?: string,
};

export class RAG {
  vs: VectorStore;
  token: string;
  systemPrompt: string;
  constructor({ indexFilePath, token, systemPrompt }: RAGProps) {
    this.vs = new VectorStore(indexFilePath, false);
    this.systemPrompt = systemPrompt ?? PROMPT;
    const apiKey = token ?? process.env.OPENAI_API_KEY;
    if (apiKey == null) {
      throw new Error("Could not find OPENAI API KEY")
    }
    this.token = apiKey
  }

  async chat(message: string): Promise<ChatResponse> {
    const PROMPT_SIZE = getSize(PROMPT);
    let rest = MAX_PROMPT_SIZE - RETURN_SIZE - PROMPT_SIZE;
    const inputSize = getSize(message);
    if (rest < inputSize) {
      throw new Error("too large input!");
    }
    rest -= inputSize;

    const samples = await this.vs.getSorted(message);

    const toUse: string[] = [];
    const usedTitle: string[] = [];
    for (const [_sim, body, title] of samples) {
      if (usedTitle.includes(title)) {
        continue;
      }
      const size = getSize(body);
      if (rest < size) {
        break;
      }
      toUse.push(body);
      usedTitle.push(title);
      rest -= size;
    }

    const text = toUse.join("\n\n");
    const prompt = this.systemPrompt.replace("{input}", message).replace("{text}", text);

    console.debug("\nTHINKING...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: RETURN_SIZE,
        temperature: 0.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const data = OpenAIChatCompletionResponse.parse(await response.json());
    const content = data.choices[0].message.content;

    console.debug("\nANSWER:");
    console.debug(`>>>> ${message}`);
    console.debug(`> ${content}`);
    return {
      message: content,
      sessionId: '',
      context: toUse,
    };
  }
}
