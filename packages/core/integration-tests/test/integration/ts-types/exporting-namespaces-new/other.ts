export const a = { otherA: "other.ts - a" }; // This name conflicts with "a" in namespace-internal.ts, so it needs a disambiguator.
export const b = { otherB: "other.ts - b" }; // This name conflicts with "b" in wildcard-exports.ts, so one of them needs a disambiguator
export const c = { otherC: "other.ts - c" }; // This is renamed when it is exported by namespace.ts.
const d = { otherD: "other.ts - d" };
export default d;
export const e = { otherE: "other.ts - e" };
export const f = { otherF: "other.ts - f" };

export const unused = { otherUnused: "other.ts - unused" }; // This is unused anywhere and should be dropped.

export class ClassD {
    constructor(public otherClassD: string) {}
}
