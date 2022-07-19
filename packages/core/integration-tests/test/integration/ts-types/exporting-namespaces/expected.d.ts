declare function _log1(message: string): void;
export function nameConflictFunction(): {
    message: string;
};
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
declare class Stuff3Class {
    message: string;
    constructor(message: string);
}
declare function _nameConflictFunction1(): string;
export const testInstance: StuffNamespaceRoot.TestClass;
export const anotherBoolean: typeof Stuff2NamespaceReexportedRenamed.testBoolean;
export const stuff3ClassInstance: Stuff3Class;
export const myFunction: typeof _nameConflictFunction1;

//# sourceMappingURL=types.d.ts.map
