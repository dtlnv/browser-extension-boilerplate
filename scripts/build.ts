import fs from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";
import { type BuildEnv, buildManifest, type ExtensionTarget } from "../manifest.config";
import pkg from "../package.json";

const ROOT = path.resolve(import.meta.dir, "..");
const TAILWIND_BIN = path.join(ROOT, "node_modules", ".bin", "tailwindcss");

function outDirFor(target: ExtensionTarget): string {
  // Safari nests one level deeper — that's the folder you point
  // `xcrun safari-web-extension-converter` at later.
  return target === "safari"
    ? path.join(ROOT, "build/safari/Resources")
    : path.join(ROOT, `build/${target}`);
}

async function buildScript(
  entry: string,
  outfile: string,
  outDir: string,
  env: BuildEnv,
  target: ExtensionTarget,
) {
  const result = await Bun.build({
    entrypoints: [path.join(ROOT, entry)],
    outdir: outDir,
    target: "browser",
    format: "iife",
    splitting: false,
    minify: env === "prod",
    sourcemap: env === "prod" ? "none" : "linked",
    naming: outfile,
    tsconfig: path.join(ROOT, "tsconfig.json"),
    define: {
      __EXTENSION_NAME__: JSON.stringify(pkg.name),
      __TARGET__: JSON.stringify(target),
      __APP_ENV__: JSON.stringify(env),
    },
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error(`Build failed: ${entry}`);
  }
}

async function buildStyles(outDir: string, env: BuildEnv) {
  const input = path.join(ROOT, "src/popup/styles.css");
  const output = path.join(outDir, "popup.css");
  const flags = env === "prod" ? ["--minify"] : [];
  await $`${TAILWIND_BIN} -i ${input} -o ${output} ${flags}`.quiet();
}

async function copyStaticAssets(outDir: string) {
  await cp(path.join(ROOT, "public/icons"), path.join(outDir, "icons"), { recursive: true });
  await cp(path.join(ROOT, "public/_locales"), path.join(outDir, "_locales"), { recursive: true });
  await cp(path.join(ROOT, "src/popup/index.html"), path.join(outDir, "popup.html"));
}

async function build(target: ExtensionTarget, env: BuildEnv, options: { clean?: boolean } = {}) {
  const outDir = outDirFor(target);
  if (options.clean ?? true) {
    // Skipped on watch-mode rebuilds: deleting/recreating outDir on every
    // rebuild was observed to occasionally confuse the recursive fs.watch on
    // public/ into firing phantom "rename" events for public/icons, causing
    // rebuild cascades. Overwriting files in place avoids that entirely.
    await rm(outDir, { recursive: true, force: true });
  }
  await mkdir(outDir, { recursive: true });

  await Promise.all([
    buildScript("src/background/index.ts", "background.js", outDir, env, target),
    buildScript("src/content/index.ts", "content.js", outDir, env, target),
    buildScript("src/popup/index.tsx", "popup.js", outDir, env, target),
    buildStyles(outDir, env),
  ]);

  await Bun.write(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(buildManifest(target, env), null, 2)}\n`,
  );

  await copyStaticAssets(outDir);
}

function parseArgs(argv: string[]) {
  const flag = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const target = (flag("target") ?? "chromium") as ExtensionTarget;
  const env = (flag("env") ?? "dev") as BuildEnv;
  const watch = argv.includes("--watch");

  if (!["chromium", "firefox", "safari"].includes(target)) {
    throw new Error(`Unknown --target=${target}. Use chromium|firefox|safari.`);
  }
  if (!["dev", "prod"].includes(env)) {
    throw new Error(`Unknown --env=${env}. Use dev|prod.`);
  }
  return { target, env, watch };
}

async function watchEachSubdirectory(dir: string, onChange: () => void) {
  fs.watch(dir, onChange);
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await watchEachSubdirectory(path.join(dir, entry.name), onChange);
    }
  }
}

function watchTree(dir: string, onChange: () => void) {
  try {
    // Recursive watch works on macOS/Windows. Falls back below on platforms
    // (e.g. Linux) where Node/Bun throw ERR_FEATURE_UNAVAILABLE_ON_PLATFORM.
    fs.watch(dir, { recursive: true }, onChange);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM") {
      void watchEachSubdirectory(dir, onChange);
    } else {
      throw err;
    }
  }
}

async function main() {
  const { target, env, watch } = parseArgs(process.argv.slice(2));

  await build(target, env);
  console.log(`Built ${target} [${env}] -> ${outDirFor(target)}`);

  if (watch) {
    console.log(
      "Watching src/, public/, manifest.config.ts — reload the extension manually after each rebuild.",
    );
    let timer: ReturnType<typeof setTimeout> | null = null;
    let building = false;
    let rebuildQueued = false;

    const runBuild = async () => {
      building = true;
      const start = performance.now();
      try {
        await build(target, env, { clean: false });
        console.log(`Rebuilt in ${(performance.now() - start).toFixed(0)}ms`);
      } catch (err) {
        console.error("Build failed:", err);
      } finally {
        building = false;
        // A change arrived while this build was running — run exactly one more,
        // instead of letting every fs event during the build queue its own rebuild.
        if (rebuildQueued) {
          rebuildQueued = false;
          void runBuild();
        }
      }
    };

    const scheduleRebuild = () => {
      if (building) {
        rebuildQueued = true;
        return;
      }
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(runBuild, 150);
    };

    watchTree(path.join(ROOT, "src"), scheduleRebuild);
    watchTree(path.join(ROOT, "public"), scheduleRebuild);
    fs.watch(path.join(ROOT, "manifest.config.ts"), scheduleRebuild);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
