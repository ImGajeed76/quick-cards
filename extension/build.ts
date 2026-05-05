import { execSync } from "child_process";
import { rmSync, cpSync, mkdirSync } from "fs";

const isWatch = process.argv.includes("--watch");

const TARGETS = ["chrome", "firefox"] as const;
type Target = (typeof TARGETS)[number];

const STAGING = "dist/.staging";

async function build(): Promise<void> {
  console.log("Building QuickCards extension...\n");

  // Clean previous output so stale per-target files cannot survive a rename.
  rmSync("dist", { recursive: true, force: true });
  mkdirSync(STAGING, { recursive: true });

  // 1. Build TypeScript once into staging.
  console.log("1. Building TypeScript...");
  const buildConfigs = [
    { entry: "src/popup/popup.ts", out: "popup.js" },
    { entry: "src/content/content.ts", out: "content.js" },
    { entry: "src/background/background.ts", out: "background.js" },
  ];

  for (const config of buildConfigs) {
    const result = await Bun.build({
      entrypoints: [config.entry],
      outdir: STAGING,
      naming: config.out,
      minify: !isWatch,
      sourcemap: isWatch ? "inline" : "none",
      target: "browser",
    });

    if (!result.success) {
      console.error(`   Failed to build ${config.entry}`);
      result.logs.forEach((log) => console.error(log));
      process.exit(1);
    }

    const file = Bun.file(`${STAGING}/${config.out}`);
    const size = file.size;
    const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
    console.log(`   -> ${config.out} (${sizeStr})`);
  }

  // 1b. Strip external code references from staged bundles.
  // jsPDF bakes a https://cdnjs.cloudflare.com/.../pdfobject.min.js URL into
  // its `output("pdfobjectnewwindow")` helper, which we never invoke. Chrome
  // MV3 review still flags any reference to externally hosted code, even on
  // dead paths (CWS rejected v1.6.0 over exactly this string). Strip the URL
  // and matching subresource integrity attribute so the dead code becomes
  // benign even by static scan. Applied to staging so both Chrome and
  // Firefox per-target dirs inherit the strip.
  console.log("\n   Stripping external code references...");
  const REMOTE_CODE_PATTERNS: Array<[RegExp, string]> = [
    [/https:\/\/cdnjs\.cloudflare\.com\/[^"']*/g, ""],
    [/\sintegrity="sha\d+-[^"]*"/g, ""],
  ];
  for (const config of buildConfigs) {
    const path = `${STAGING}/${config.out}`;
    let content = await Bun.file(path).text();
    let edits = 0;
    for (const [pattern, replacement] of REMOTE_CODE_PATTERNS) {
      content = content.replace(pattern, () => {
        edits++;
        return replacement;
      });
    }
    if (edits > 0) {
      await Bun.write(path, content);
      console.log(`   -> ${config.out}: stripped ${edits} reference(s)`);
    }
  }

  // 2. Build CSS once.
  console.log("\n2. Building CSS...");
  execSync(`bunx @tailwindcss/cli -i src/styles/tailwind.css -o ${STAGING}/styles.css --minify`, {
    stdio: "inherit",
  });

  // 3. Stage shared static files (everything except manifest).
  console.log("\n3. Staging static files...");
  const popupHtml = await Bun.file("src/popup/popup.html").text();
  await Bun.write(`${STAGING}/popup.html`, popupHtml);

  const icons = ["icon16.png", "icon48.png", "icon128.png"];
  for (const icon of icons) {
    const iconData = await Bun.file(`public/icons/${icon}`).arrayBuffer();
    await Bun.write(`${STAGING}/icons/${icon}`, iconData);
  }

  // sql.js WASM. Bun's "browser" target resolves sql.js to its browser build,
  // which requests `sql-wasm-browser.wasm` at runtime.
  const sqlWasm = await Bun.file("node_modules/sql.js/dist/sql-wasm-browser.wasm").arrayBuffer();
  await Bun.write(`${STAGING}/sql-wasm-browser.wasm`, sqlWasm);

  // 4. Materialize each target: copy staging, write target-specific manifest.
  console.log("\n4. Writing per-target outputs...");
  const baseManifest = await Bun.file("public/manifest.json").json();

  for (const target of TARGETS) {
    const outDir = `dist/${target}`;
    cpSync(STAGING, outDir, { recursive: true });

    const manifest = transformManifest(baseManifest, target);
    await Bun.write(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`   -> ${outDir}/`);
  }

  rmSync(STAGING, { recursive: true, force: true });

  console.log("\nBuild complete!");
}

function transformManifest(base: Record<string, unknown>, target: Target): Record<string, unknown> {
  const manifest = structuredClone(base);

  if (target === "firefox") {
    const m = manifest as Record<string, unknown>;

    // Firefox MV3 still gates `background.service_worker` behind a pref. Use
    // event-page `scripts` instead, which Firefox loads natively. Chrome
    // ignores this branch via the per-target manifest.
    m.background = { scripts: ["background.js"] };

    // AMO requires a stable ID.
    m.browser_specific_settings = {
      gecko: {
        id: "quickcards@oseifert.ch",
        strict_min_version: "115.0",
      },
    };
  }

  return manifest;
}

build().catch(console.error);
