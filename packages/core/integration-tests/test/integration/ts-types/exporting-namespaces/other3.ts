export function nameConflictFunction2(): { message: string } {
  return { message: "this function's name conflicts with the top-level export in stuff.ts" }
}

export const nameConflictString: string = "This variable's name conflicts with an export from stuff.ts";
