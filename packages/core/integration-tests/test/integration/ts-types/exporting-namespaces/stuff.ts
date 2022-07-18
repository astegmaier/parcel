import { log as logFn1 } from "./other1";
import { log as logFn2 } from "./other2";

export function log(f: typeof logFn1 | typeof logFn2) {
  logFn1("1");
  logFn2(1);
}

export interface TestInterface {
  foo: number;
  bar: boolean;
}

export const testNumber: number = 123;

export const testString: string = "hello!";

export class TestClass {
  a: string;
  b: number;
  constructor() {
    this.a = "baz";
    this.b = 456;
  }
}
