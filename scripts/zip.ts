import { createWriteStream, existsSync } from "node:fs";
import path from "node:path";
import archiver from "archiver";
import pkg from "../package.json";

type Target = "chromium" | "firefox" | "safari";

function parseBrowser(argv: string[]): Target {
  const value = (argv.find((a) => a.startsWith("--browser="))?.split("=")[1] ??
    "chromium") as Target;
  if (!["chromium", "firefox", "safari"].includes(value)) {
    throw new Error(`Unknown --browser=${value}. Use chromium|firefox|safari.`);
  }
  return value;
}

const ROOT = path.resolve(import.meta.dir, "..");
const target = parseBrowser(process.argv.slice(2));
const sourceDir =
  target === "safari"
    ? path.join(ROOT, "build/safari/Resources")
    : path.join(ROOT, `build/${target}`);

if (!existsSync(sourceDir)) {
  throw new Error(`${sourceDir} does not exist. Run \`bun run build:${target}\` first.`);
}

const zipFileName = `extension-${target}-v${pkg.version}.zip`;
const zipPath = path.join(ROOT, zipFileName);

const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });

const finished = new Promise<void>((resolve, reject) => {
  output.on("close", resolve);
  archive.on("warning", (err) => (err.code === "ENOENT" ? console.warn(err) : reject(err)));
  archive.on("error", reject);
});

archive.pipe(output);
archive.directory(sourceDir, false);
await archive.finalize();
await finished;

console.log(`Created ${zipFileName} (${output.bytesWritten} bytes) from ${sourceDir}`);
