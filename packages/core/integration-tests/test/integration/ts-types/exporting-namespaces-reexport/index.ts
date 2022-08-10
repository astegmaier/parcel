import * as MyNamespace from "./namespace";
export { MyNamespace };
export * as MyNamespace2 from "./namespace2";

import { MyInternalNamespace } from "./internal-namespace-exporter";
export const barConsumer: typeof MyInternalNamespace.bar = {} as any;
export const bazConsumer: typeof MyInternalNamespace.baz = {} as any;
