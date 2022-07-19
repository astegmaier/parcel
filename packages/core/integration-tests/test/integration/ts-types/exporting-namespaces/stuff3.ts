export class Stuff3Class {
  constructor(public message: string) {}
}

export function nameConflictFunction(): string {
  return "this function's name conflicts with the top-level export in other1.ts"
}
