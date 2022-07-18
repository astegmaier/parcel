declare function _log1(message: string): void;
declare function xyz(message: number): void;
export namespace StuffNamespaceRoot {
    export function log(f: typeof _log1 | typeof xyz): void;
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
export namespace Stuff2NamespaceReexportedRenamed {
    export const testBoolean: boolean;
}
export const testInstance: StuffNamespaceRoot.TestClass;

//# sourceMappingURL=types.d.ts.map
