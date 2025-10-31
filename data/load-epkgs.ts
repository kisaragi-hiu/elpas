import { Database } from "bun:sqlite";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

// readline can read lines from a Node stream
// no support for web streams, unfortunately
const db = new Database("cache/epkgs.sqlite");
for await (const line of createInterface({
  input: createReadStream("./cache/epkg.sql"),
  crlfDelay: Infinity,
})) {
  db.run(line);
}
