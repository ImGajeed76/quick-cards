import { execSync } from "child_process";

const isWatch = process.argv.includes("--watch");

async function build() {
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
    const sizeStr =
      size > 1024
        ? `${(size / 1024).toFixed(1)}KB`
        : `${size}B`;
    console.log(`   -> dist/${config.out} (${sizeStr})`);
  }

  // Build CSS with Tailwind
  console.log("\n2. Building CSS...");
  execSync(
    "bunx @tailwindcss/cli -i src/styles/tailwind.css -o dist/styles.css --minify",
    { stdio: "inherit" }
  );

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

  console.log("\nBuild complete!");
}

build().catch(console.error);
