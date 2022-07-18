export * as StuffNamespaceRoot from './stuff';

export { StuffNamespaceReexported as StuffNamespaceReexportedRenamed, Stuff2NamespaceReexported as Stuff2NamespaceReexportedRenamed } from "./re-exporter"
import { StuffNamespaceInternal as StuffNamespaceInternalRenamed, Stuff2NamespaceNotExportedAtTopLevel } from "./internal-exporter"

export const testInstance = new StuffNamespaceInternalRenamed.TestClass();

export const anotherBoolean: typeof Stuff2NamespaceNotExportedAtTopLevel.testBoolean = false;
