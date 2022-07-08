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
