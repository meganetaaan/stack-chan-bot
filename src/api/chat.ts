import { Hono } from "hono";
import { RAG } from "@services/rag";
import z from "zod";

const token = process.env.OPENAI_API_KEY;
if (token == null) {
  throw new Error("Could not fine api key");
}
export const chat = new Hono();
const rag = new RAG({
  indexFilePath: "src/services/assets/stack-chan.index.json",
  token,
});

export const AskRequest = z.object({
  message: z.string(),
  sessionId: z.optional(z.string()),
});
export const AskResponse = z.object({
  message: z.string(),
  context: z.array(z.string()),
});

// 質問応答のエンドポイント
chat.post("/ask", async (c) => {
  const requestBody = await c.req.json()
  console.log(requestBody)
  const result = AskRequest.safeParse(requestBody);
  if (!result.success) {
    c.status(403);
    return c.text(`Invalid Request: ${ result.error }`);
  }
  c.status(200);
  return c.json(await rag.chat(result.data.message));
});
