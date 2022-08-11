declare const a: {
    namespaceInternalA: string;
};
export namespace MyOtherNamespace {
    export const a: {
        namespaceOtherA: string;
    };
}
declare const _a1: {
    otherA: string;
};
export const b: {
    otherB: string;
};
declare const _c1: {
    otherC: string;
};
declare const d: {
    otherD: string;
};
declare const e: {
    otherE: string;
};
export const f: {
    otherF: string;
};
declare class ClassD {
    otherClassD: string;
    constructor(otherClassD: string);
}
interface InterfaceA {
    otherInterfaceA: string;
}
declare const _b1: {
    wildcardExportsB: string;
};
declare class ClassB {
    wildCardExportClassB: string;
    constructor(wildCardExportClassB: string);
}
export const c: {
    wildcardExportsC: string;
};
export class ClassC {
    wildCardExportClassC: string;
    constructor(wildCardExportClassC: string);
}
export namespace MyNamespace {
    const _a2: {
        namespaceA: string;
    };
    export { _a2 as a };
    export const aa: typeof a;
    export const aaa: typeof _a1;
    export const aaaa: typeof MyOtherNamespace.a;
    export class ClassA {
        namespaceClassA: string;
        constructor(namespaceClassA: string);
    }
    export { _b1 as b, ClassB, c, ClassC };
    export { _c1 as cRenamed, d as dRenamed, e, f };
    const b: {
        namespaceB: string;
    };
    export const bConsumer: typeof b;
    const _e1: {
        namespaceE: string;
    };
    export const eConsumer: typeof _e1;
    class _ClassD1 {
        namespaceClassD: string;
        constructor(namespaceClassD: string);
    }
    export { _ClassD1 as ClassD };
    export const otherClassDConsumer: ClassD;
    interface _InterfaceA1 {
        namespaceInterfaceA: string;
    }
    export { type _InterfaceA1 as InterfaceA };
    export type OtherInterfaceAAlias = InterfaceA;
    export { b as default };
}
export { MyNamespace as MyNamespaceAlias };
export namespace Level3Namespace {
    export const a: {
        level3A: string;
    };
}
export namespace Level2Namespace {
    export const a: {
        level2A: string;
    };
    export { Level3Namespace as Level3NamespaceInternal };
}
export const classAInstance: MyNamespace.ClassA;
export const namespaceAConsumer: typeof MyNamespace.a;
export const namespaceClassDConsumer: MyNamespace.ClassD;
export const level2AConsumer: typeof Level2Namespace.a;
export const level3AConsumer: typeof Level3Namespace.a;

//# sourceMappingURL=types.d.ts.map
