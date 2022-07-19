export * as StuffNamespaceRoot from './stuff';

export { nameConflictFunction } from "./other1"
export { nameConflictFunction2 } from "./other3";

export { StuffNamespaceReexported as StuffNamespaceReexportedRenamed, Stuff2NamespaceReexported as Stuff2NamespaceReexportedRenamed } from "./re-exporter"
import { StuffNamespaceInternal as StuffNamespaceInternalRenamed, Stuff2NamespaceNotExportedAtTopLevel, Stuff3NamespaceNotExportedAtTopLevel } from "./internal-exporter"

export const testInstance = new StuffNamespaceInternalRenamed.TestClass();

export const anotherBoolean: typeof Stuff2NamespaceNotExportedAtTopLevel.testBoolean = false;

export const stuff3ClassInstance = new Stuff3NamespaceNotExportedAtTopLevel.Stuff3Class("Hello");

export const myFunction: typeof Stuff3NamespaceNotExportedAtTopLevel.nameConflictFunction = () => "Hello";
