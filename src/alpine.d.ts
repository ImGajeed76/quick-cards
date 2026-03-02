declare module "@alpinejs/csp" {
  import type { Alpine as AlpineType } from "alpinejs";
  const Alpine: AlpineType;
  export default Alpine;
}

declare module "@alpinejs/collapse" {
  import type { PluginCallback } from "alpinejs";
  const collapse: PluginCallback;
  export default collapse;
}
