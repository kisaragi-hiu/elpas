import { Database } from "bun:sqlite";
const db = new Database("cache/epkgs.sqlite");
db.run(await Bun.file("./cache/epkg.sql").text());
