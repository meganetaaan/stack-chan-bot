import { Hono } from "hono";
import * as dotenv from "dotenv";
import type { DocumentRepositoryInterface } from "../services/documentRepository";
import { ChromaClient } from "chromadb";

dotenv.config();

const app = new Hono();

// 環境設定や他の要因に基づいてリポジトリを選択
let documentRepository: DocumentRepositoryInterface;
if (process.env["USE_CHROMA_DB"] === "true") {
  const chromaClient = new ChromaClient(); // 仮のクライアント初期化
  documentRepository = new ChromaDocumentRepository(chromaClient);
} else {
  documentRepository = new JsonDocumentRepository("documents.json");
}

// データセットのリストを取得するエンドポイント
app.get("/documents", async (c) => {
  const documents = await documentRepository.getDocuments();
  return c.json({ documents });
});

// データセットを登録するエンドポイント
app.post("/documents", async (c) => {
  const { document } = await c.req.json();
  if (!document) {
    return c.json({ error: "Document is required" }, 400);
  }
  await documentRepository.addDocument(document);
  return c.json({
    message: "Document added successfully",
    documents: await documentRepository.getDocuments(),
  });
});

// データセットを更新するエンドポイント
app.put("/documents", async (c) => {
  const { oldDocument, newDocument } = await c.req.json();
  if (!oldDocument || !newDocument) {
    return c.json({ error: "Old document and new document are required" }, 400);
  }
  await documentRepository.updateDocument(oldDocument, newDocument);
  return c.json({
    message: "Document updated successfully",
    documents: await documentRepository.getDocuments(),
  });
});

// データセットを削除するエンドポイント
app.delete("/documents", async (c) => {
  const { document } = await c.req.json();
  if (!document) {
    return c.json({ error: "Document is required" }, 400);
  }
  await documentRepository.deleteDocument(document);
  return c.json({
    message: "Document deleted successfully",
    documents: await documentRepository.getDocuments(),
  });
});
