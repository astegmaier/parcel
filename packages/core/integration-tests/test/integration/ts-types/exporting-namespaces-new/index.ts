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

import { Level1Namespace } from "./nested/level1-exporter";
export { Level2Namespace } from "./nested/level2-exporter";
export * as Level3Namespace from "./nested/level3";

export const level2AConsumer: typeof Level1Namespace.Level2Namespace.a = { level2A: "index.ts - level2AConsumer" };
export const level3AConsumer: typeof Level1Namespace.Level2Namespace.Level3NamespaceInternal.a = { level3A: "index.ts - level3AConsumer" };
// Expected output:
// export const level2AConsumer: typeof Level2Namespace.a; <-- We can successfully flatten and shake Level1Namespace.
// export const level3AConsumer: typeof Level3Namespace.a; <-- Level3NamespaceInternal gets renamed to Level3Namespace.
