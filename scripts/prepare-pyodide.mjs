import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceDirectory = join(projectRoot, "node_modules", "pyodide");
const outputDirectory = join(projectRoot, "public", "pyodide");
const runtimeFiles = ["pyodide.mjs", "pyodide.asm.js", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"];

await mkdir(outputDirectory, { recursive: true });
await Promise.all(runtimeFiles.map((fileName) => copyFile(join(sourceDirectory, fileName), join(outputDirectory, fileName))));
