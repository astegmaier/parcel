export * as StuffNamespaceRoot from './stuff';

export { StuffNamespaceReexport } from "./re-exporter"
import { StuffNamespaceInternal } from "./internal-exporter"

export const testInstance = new StuffNamespaceInternal.TestClass();
