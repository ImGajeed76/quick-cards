// Lazy sql.js initializer. Loads the WASM from /sql-wasm-browser.wasm (static/).
// Cached across invocations so repeated Anki exports don't re-initialize.

import type { SqlJsStatic } from "sql.js";

let sqlPromise: Promise<SqlJsStatic> | null = null;

export function getSQL(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { default: initSqlJs } = await import("sql.js");
      return initSqlJs({
        locateFile: () => "/sql-wasm-browser.wasm",
      });
    })();
  }
  return sqlPromise;
}
