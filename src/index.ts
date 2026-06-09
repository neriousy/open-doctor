#!/usr/bin/env node
// Executable entrypoint: keep startup and top-level error formatting in one place.
import process from "node:process"
import { Effect } from "effect"
import { main } from "./cli/main.js"
import { formatError } from "./error.js"

Effect.runPromise(main(process.argv.slice(2))).catch((error: unknown) => {
  console.error(formatError(error))
  process.exitCode = 1
})
