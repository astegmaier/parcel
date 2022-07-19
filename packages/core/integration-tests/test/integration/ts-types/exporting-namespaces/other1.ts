export function log(message: string) {}

export function nameConflictFunction(): { message: string } {
  return { message: "this function's name conflicts with the top-level export in stuff3.ts" }
}
