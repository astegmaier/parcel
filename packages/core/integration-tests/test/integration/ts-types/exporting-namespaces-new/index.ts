export * as MyNamespace from "./namespace";
// Expected output:
// export namespace MyNamespace { /* the transformed contents of namespace.ts /* }

export * as MyNamespaceAlias from "./namespace"
// Expected output:
// export { MyNamespace as MyNamespaceAlias };

export { MyOtherNamespace } from "./namespace-other-exporter";
// Expected output:
// export namespace MyOtherNamespace { /* the transformed contents of namespace-other.ts /* }

import { ClassA } from "./namespace";
export const classAInstance = new ClassA("classAInstance - index.ts");
// Expected output:
// export const classAInstance: MyNamespace.ClassA;

export { c, ClassC } from "./wildcard-exports";
// Expected output:
// export const c: { wildcardExportsC: string};
// export class ClassC { wildCardExportClassA: string; }

export { b, f } from "./other";
// Expected output:
// export const b: { otherB: string };
// export const f: { otherF: string };

import * as MyNamespaceRenamed from "./namespace";
export const namespaceAConsumer: typeof MyNamespaceRenamed.a = { namespaceA: "index.ts - namespaceAConsumer" };
export const namespaceClassDConsumer = new MyNamespaceRenamed.ClassD("index.ts - namespaceClassDConsumer");
// Expected output:
// export const namespaceAConsumer: typeof MyNamespace.a; <-- we snap to the primary namespace name, and use the exported name "a", not the internal name "_a2"
// export const namespaceClassDConsumer: MyNamespace.ClassD;
