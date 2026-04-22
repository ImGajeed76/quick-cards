// Lazy sql.js initializer. Loads the WASM from /sql-wasm-browser.wasm (static/).
// Cached across invocations so repeated Anki exports don't re-initialize.

let sqlPromise: Promise<unknown> | null = null;

export function getSQL(): Promise<unknown> {
	if (!sqlPromise) {
		sqlPromise = (async () => {
			const { default: initSqlJs } = await import('sql.js');
			return initSqlJs({
				locateFile: () => '/sql-wasm-browser.wasm'
			});
		})();
	}
	return sqlPromise;
}
