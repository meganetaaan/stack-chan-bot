import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import cliProgress from "cli-progress";
import { getSize, VectorStore, type VectorRecord } from "@models/vector-store";

const BLOCK_SIZE = 500;

dotenv.config();
/**
 *
 * @param jsonFile
 * @param outIndex
 * @param inIndex
 */
async function updateFromScrapbox(
  jsonFile: string,
  outIndex: string,
  inIndex?: string
) {
  const cache: VectorRecord | undefined = inIndex
    ? JSON.parse(readFileSync(inIndex, "utf8"))
    : undefined;

  const vs = new VectorStore(outIndex);
  const data = JSON.parse(readFileSync(jsonFile, "utf8"));

  const bar = new cliProgress.SingleBar({
    format:
      "Making Indices | {bar} | {percentage}% || {value}/{total} Pages || Speed: {speed}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  bar.start(data.pages.length, 0);
  for (const p of data.pages) {
    const buf: string[] = [];
    const title = p.title;

    for (const line of p.lines) {
      buf.push(line);
      const body = buf.join(" ");
      if (getSize(body) > BLOCK_SIZE) {
        await vs.addRecord(body, title, cache);
        buf.splice(0, Math.floor(buf.length / 2));
      }
    }

    const body = buf.join(" ").trim();
    if (body) {
      await vs.addRecord(body, title, cache);
    }
    bar.increment();
  }
  bar.stop();

  vs.save();
}

if (require.main === module) {
  // Sample default arguments for updateFromScrapbox()
  const JSON_FILE = "src/services/assets/stack-chan.json";
  const INDEX_FILE = "src/services/sassets/tack-chan.index.json";

  updateFromScrapbox(JSON_FILE, INDEX_FILE).then(() => {
    console.log("Update completed.");
  });
}
