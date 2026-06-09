import fs from "node:fs"
import path from "node:path"
import { $ } from "bun"

const root = path.resolve(import.meta.dir, "..")
const outdir = path.join(root, "dist")
const binDir = path.join(root, "bin")
const binFile = path.join(binDir, "open-doctor")

fs.rmSync(outdir, { recursive: true, force: true })
fs.rmSync(binDir, { recursive: true, force: true })

const esbuild = path.resolve(root, "../../node_modules/.bin/esbuild")
const entry = path.join(root, "src/index.ts")

await $`${esbuild} ${entry} --bundle --platform=node --format=esm --splitting --target=node20.17 --outdir=${outdir} --chunk-names=chunks/[name]-[hash] --external:better-sqlite3 --external:@opentui/core --jsx=automatic --jsx-import-source=@opentui/react --log-level=info`

fs.mkdirSync(binDir, { recursive: true })
fs.writeFileSync(
  binFile,
  `#!/usr/bin/env node
import childProcess from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const target = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.js")
const child = childProcess.spawn(process.execPath, [target, ...process.argv.slice(2)], {
  stdio: "inherit",
})

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal))
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(typeof code === "number" ? code : 0)
})
`,
)
fs.chmodSync(binFile, 0o755)
fs.chmodSync(path.join(outdir, "index.js"), 0o755)
