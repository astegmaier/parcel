declare function log(message: string): void;
export function nameConflictFunction(): {
    message: string;
};
declare function xyz(message: number): void;
export function nameConflictFunction2(): {
    message: string;
};
export const nameConflictString: string;
export namespace StuffNamespaceRoot {
    function _log1(f: typeof log | typeof xyz): void;
    export { _log1 as log };
    function _nameConflictFunction21(): string;
    export { _nameConflictFunction21 as nameConflictFunction2 };
    const _nameConflictString1: typeof nameConflictString;
    export { _nameConflictString1 as nameConflictString };
    export interface TestInterface {
        foo: number;
        bar: boolean;
    }
    export const testNumber: number;
    export const testString: string;
    export class TestClass {
        a: string;
        b: number;
        myFunction: typeof nameConflictFunction2;
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
export const somethingWithTypingFromARenamedNamespaceExport: typeof StuffNamespaceRoot.nameConflictFunction2;

//# sourceMappingURL=types.d.ts.map
