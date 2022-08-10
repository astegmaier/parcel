export const foo: string = "hello";
import { MyInternalNamespace } from "./internal-namespace-exporter";
import * as MyInternalNamespace2 from "./namespace2";
export const barConsumer: typeof MyInternalNamespace.bar = {} as any;
export const bazConsumer: typeof MyInternalNamespace.baz = {} as any;
export const quxConsumer: typeof MyInternalNamespace2.qux = {} as any;
