// These conflict with other exports from namespace.ts and will be dropped
export const a = { wildcardExportsA: "wildcard-exports.ts - a" };
export class ClassA {
    constructor(public wildCardExportClassA: string) {}
}

// These do not conflict, and should declared (not exported) at the top-level, and re-exported by MyNamspace.ts
export const b = { wildcardExportsB: "wildcard-exports.ts - b" };// This needs a disambiguator to distinguish it from "b" in other.ts
export class ClassB {
    constructor(public wildCardExportClassB: string) {}
}

// These do not conflict, and should _exported_ at the top-level, and re-exported by MyNamspace.ts
export const c = { wildcardExportsC: "wildcard-exports.ts - c" }; // This needs a disambiguator to distinguish it from "c" in other.ts
export class ClassC {
    constructor(public wildCardExportClassC: string) {}
}
