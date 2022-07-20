import { log as logFn1 } from "./other1";
import { log as logFn2 } from "./other2";
import { nameConflictFunction2 as nameConflictFunction2Local, nameConflictString as nameConflictStringLocal } from "./other3";

export function log(f: typeof logFn1 | typeof logFn2) {
  logFn1("1");
  logFn2(1);
}

export function nameConflictFunction2(): string {
  return "this function's name conflicts with a top-level export in other3.ts";
}

export const nameConflictString: typeof nameConflictStringLocal = "This variable's name conflicts with a top-level export from other3.ts";

export interface TestInterface {
  foo: number;
  bar: boolean;
}

export const testNumber: number = 123;

export const testString: string = "hello!";

export class TestClass {
  a: string;
  b: number;
  myFunction: typeof nameConflictFunction2Local;
  constructor() {
    this.a = "baz";
    this.b = 456;
  }
}
