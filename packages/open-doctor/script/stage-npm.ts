import fs from "node:fs"
import path from "node:path"
import pkg from "../package.json" with { type: "json" }

const root = path.resolve(import.meta.dir, "..")
const workspaceRoot = path.resolve(root, "../..")
const stage = path.join(root, ".release", pkg.name)
const rootPkg = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8")) as {
  workspaces?: {
    catalog?: Record<string, string>
  }
}

const catalog = rootPkg.workspaces?.catalog ?? {}
const opentuiCore = catalog["@opentui/core"]
if (!opentuiCore) throw new Error("Missing @opentui/core catalog version")

fs.rmSync(stage, { recursive: true, force: true })
fs.mkdirSync(stage, { recursive: true })

copy(path.join(root, "bin"), path.join(stage, "bin"))
copy(path.join(root, "dist"), path.join(stage, "dist"))
copy(path.join(root, "README.md"), path.join(stage, "README.md"))

const manifest = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  bin: pkg.bin,
  files: pkg.files,
  dependencies: {
    "@opentui/core": opentuiCore,
    "better-sqlite3": pkg.dependencies["better-sqlite3"],
  },
  engines: pkg.engines,
  license: pkg.license,
}

fs.writeFileSync(path.join(stage, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`)

function copy(from: string, to: string) {
  if (!fs.existsSync(from)) throw new Error(`Missing required package input: ${from}`)
  fs.cpSync(from, to, { recursive: true })
}
