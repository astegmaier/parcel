export * as StuffNamespaceRoot from './stuff';

import { StuffNamespaceReexport } from "./re-exporter"
export { StuffNamespaceInternal } from "./internal-exporter"

export const testInstance = new StuffNamespaceInternal.TestClass();
