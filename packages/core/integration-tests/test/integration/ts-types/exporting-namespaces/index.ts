export * as StuffNamespaceRoot from './stuff';

export { StuffNamespaceReexported as StuffNamespaceReexportedRenamed } from "./re-exporter"
export { Stuff2NamespaceReexported as Stuff2NamespaceReexportedRenamed } from "./re-exporter"
import { StuffNamespaceInternal as StuffNamespaceInternalRenamed } from "./internal-exporter"

export const testInstance = new StuffNamespaceInternalRenamed.TestClass();
