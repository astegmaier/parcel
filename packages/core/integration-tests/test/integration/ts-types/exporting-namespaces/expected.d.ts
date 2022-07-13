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
export { StuffNamespaceRoot as StuffNamespaceReexportedRenamed };
export const testInstance: StuffNamespaceRoot.TestClass;

//# sourceMappingURL=types.d.ts.map
