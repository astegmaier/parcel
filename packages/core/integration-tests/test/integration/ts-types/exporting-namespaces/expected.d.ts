export namespace StuffNamespaceRoot {
  export interface TestInterface {
      foo: number;
      bar: boolean;
  }
  export const testNumber: number;
  export const testString: string;
  export class TestClass {
      a: string;
      b: number;
      constructor();
  }
}
export { StuffNamespace as StuffNamespaceReexport };
export const testInstance: StuffNamespaceRoot.TestClass;

//# sourceMappingURL=types.d.ts.map
