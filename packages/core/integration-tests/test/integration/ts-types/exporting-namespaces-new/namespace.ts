import { MyInternalNamespace } from "./namespace-internal-exporter";
import { MyOtherNamespace } from "./namespace-other-exporter";
import { a as aImportedAlias, ClassD as OtherClassD, InterfaceA as OtherInterfaceA } from "./other";

export const a = { namespaceA: "namespace.ts - a" };
// Expected output:
// const _a2: { namespaceA: string }; <-- we need to choose an internal alias for "a" that doesn't conflict with the other top-level names ("a" and "_a1")
// export { _a2 as a };

export const aa: typeof MyInternalNamespace.a = {
  namespaceInternalA: "namespace.ts - aa",
};
// Expected output:
// export const aa typeof a; <-- a references the top-level name "a" from the (flattened) contents of namespace-internal.ts

export const aaa: typeof aImportedAlias = { otherA: "namespace.ts - aaa" };
// Expected output:
// export const aaa: typeof _a1; <-- references the top-level name "_a1", which had a disambiguator added to it to distinguish it from the same name in namespace-internal.ts

export const aaaa: typeof MyOtherNamespace.a = {
  namespaceOtherA: "namespace.ts - aaaa",
};
// Expected output:
// export const aaaa typeof MyOtherNamespace.a <-- because MyOtherNamespace _is_ exported at the top-level, its exports don't need disambiguators (they're alreadys scoped to MyOtherNamespace).

export class ClassA {
  constructor(public namespaceClassA: string) {}
}
export * from "./wildcard-exports";
// Expected output:
// export { _b1 as b, ClassB, c, ClassC } from "./wildcard-exports"; <-- "_b1" is a disambiguator added to "b" to distinguish it from "b" in other.ts

export { c as cRenamed, default as dRenamed, e, f } from "./other";
// Expected output:
// export { _c1 as cRenamed, d as dRenamed, e, f } <-- "_c1" is necessary because "c" in other.ts conflicts with "c" in "wildcard-exports.ts"

const b = { namespaceB: "namespace.ts - b" };
export const bConsumer: typeof b = { namespaceB: "namespace.ts - bConsumer" };
// TODO: do we need the indirection of "bConsumer" here? Couldn't we test the same thing by just masking the wildcard export "b" with "export const b"?
// Expected output:
// const b: { namespaceB: string }; "b" does not need an alias because we never reference the globally-scoped "b" from other.ts (and although we do reference "b" from "wildcard-exports.ts", it already has an alias at the top-level)
// export const bRenamed: typeof b;

const e = { namespaceE: "namespace.ts - e" };
export const eConsumer: typeof e = { namespaceE: "namespace.ts - eConsumer" };
// Expected output:
// const _e1: { namespaceE: string }; <-- we need to choose an internal alias for "e" that doesn't conflict with the other named re-export export "e" (from other.ts)
// export const eConsumer: typeof _e1;

export class ClassD {
  constructor(public namespaceClassD: string) {}
}
export const otherClassDConsumer = new OtherClassD(
  "namespace.ts - otherClassDConsumer"
);
// Expected output:
// class _ClassD1 { <-- because "ClassD" conflicts with a top-level class declaration from "other.ts" that's used in this namespace, we need to add a disambiguator
//     namespaceClassD: string;
//     constructor(namespaceClassB: string);
// }
// export { _ClassD1 as ClassD }; <-- we need to preserve the original export name from the alias.
// export const otherClassDConsumer: ClassD;

export interface InterfaceA {
    namespaceInterfaceA: string;
}
export type OtherInterfaceAAlias = OtherInterfaceA;
// Expected output:
// interface _InterfaceA1 { <-- because "InterfaceA" conflicts with the top-level interface declaration from "other.ts" that's used in this namespace, we need to add a disambiguator.
//   namespaceInterfaceA: string;
// }
// export { type _InterfaceA1 as InterfaceA }; <-- we need to preserve the original export name for this alias, with a "type" modifier.
// export type OtherInterfaceAAlias = InterfaceA;

export default b;
// Expected output:
// export { b as default };
