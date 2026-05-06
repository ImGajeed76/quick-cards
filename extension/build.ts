import { execSync } from "child_process";

const isWatch = process.argv.includes("--watch");

async function build(): Promise<void> {
  console.log("Building QuickCards extension...\n");

  // Build TypeScript files
  console.log("1. Building TypeScript...");

  const buildConfigs = [
    { entry: "src/popup/popup.ts", out: "popup.js" },
    { entry: "src/content/content.ts", out: "content.js" },
    { entry: "src/background/background.ts", out: "background.js" },
  ];

  for (const config of buildConfigs) {
    const result = await Bun.build({
      entrypoints: [config.entry],
      outdir: "dist",
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

    const file = Bun.file(`dist/${config.out}`);
    const size = await file.size;
    const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
    console.log(`   -> dist/${config.out} (${sizeStr})`);
  }

  // jsPDF bakes a https://cdnjs.cloudflare.com/.../pdfobject.min.js URL into
  // its `output("pdfobjectnewwindow")` helper, which we never invoke. Chrome
  // MV3 review still flags any reference to externally hosted code, even on
  // dead paths (CWS rejected v1.6.0 over exactly this string). Strip the URL
  // and matching subresource integrity attribute so the dead code becomes
  // benign even by static scan.
  console.log("\n   Stripping external code references...");
  const REMOTE_CODE_PATTERNS: Array<[RegExp, string]> = [
    [/https:\/\/cdnjs\.cloudflare\.com\/[^"']*/g, ""],
    [/\sintegrity="sha\d+-[^"]*"/g, ""],
  ];
  for (const config of buildConfigs) {
    const path = `dist/${config.out}`;
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
      console.log(`   -> ${path}: stripped ${edits} reference(s)`);
    }
  }

  // Build CSS with Tailwind
  console.log("\n2. Building CSS...");
  execSync("bunx @tailwindcss/cli -i src/styles/tailwind.css -o dist/styles.css --minify", {
    stdio: "inherit",
  });

  // Copy static files
  console.log("\n3. Copying static files...");

  // Copy manifest
  const manifest = await Bun.file("public/manifest.json").text();
  await Bun.write("dist/manifest.json", manifest);
  console.log("   -> dist/manifest.json");

  // Copy popup HTML
  const popupHtml = await Bun.file("src/popup/popup.html").text();
  await Bun.write("dist/popup.html", popupHtml);
  console.log("   -> dist/popup.html");

  // Copy icons
  const icons = ["icon16.png", "icon48.png", "icon128.png"];
  for (const icon of icons) {
    const iconData = await Bun.file(`public/icons/${icon}`).arrayBuffer();
    await Bun.write(`dist/icons/${icon}`, iconData);
    console.log(`   -> dist/icons/${icon}`);
  }

  // Copy sql.js WASM. Bun's "browser" target resolves sql.js to its browser build,
  // which requests `sql-wasm-browser.wasm` at runtime.
  const sqlWasm = await Bun.file("node_modules/sql.js/dist/sql-wasm-browser.wasm").arrayBuffer();
  await Bun.write("dist/sql-wasm-browser.wasm", sqlWasm);
  console.log("   -> dist/sql-wasm-browser.wasm");

  console.log("\nBuild complete!");
}

build().catch(console.error);
