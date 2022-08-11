// @flow
import typeof TypeScriptModule from 'typescript'; // eslint-disable-line import/no-extraneous-dependencies
import type {ExportSpecifier, Identifier, ImportSpecifier} from 'typescript';

export function getExportedName(ts: TypeScriptModule, node: any): ?string {
  if (!node.modifiers) {
    return null;
  }

  if (!node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
    return null;
  }

  if (node.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
    return 'default';
  }

  return node.name.text;
}

export function isDeclaration(ts: TypeScriptModule, node: any): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isTypeAliasDeclaration(node)
  );
}

export function isTypeDeclaration(ts: TypeScriptModule, node: any): boolean {
  return ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
}

export function createImportSpecifier(
  ts: TypeScriptModule,
  propertyName: Identifier | void,
  name: Identifier,
  isTypeOnly: boolean = false,
): ImportSpecifier {
  const [majorVersion, minorVersion] = ts.versionMajorMinor
    .split('.')
    .map(num => parseInt(num, 10));
  // The signature of createImportSpecifier had a breaking change in Typescript 4.5.
  // see: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#type-modifiers-on-import-names
  if (majorVersion > 4 || (majorVersion === 4 && minorVersion >= 5)) {
    // $FlowFixMe[incompatible-call]
    // $FlowFixMe[extra-arg]
    return ts.createImportSpecifier(isTypeOnly, propertyName, name);
  } else {
    return ts.createImportSpecifier(propertyName, name);
  }
}

export function createExportSpecifier(
  ts: TypeScriptModule,
  propertyName: string | Identifier | void,
  name: string | Identifier,
  isTypeOnly: boolean = false,
): ExportSpecifier {
  const [majorVersion, minorVersion] = ts.versionMajorMinor
    .split('.')
    .map(num => parseInt(num, 10));
  // The signature of createExportSpecifier had a breaking change in Typescript 4.5.
  // see: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#type-modifiers-on-import-names
  if (majorVersion > 4 || (majorVersion === 4 && minorVersion >= 5)) {
    // $FlowFixMe[incompatible-call]
    // $FlowFixMe[extra-arg]
    return ts.createExportSpecifier(isTypeOnly, propertyName, name);
  } else {
    return ts.createExportSpecifier(propertyName, name);
  }
}

export function updateExportSpecifier(
  ts: TypeScriptModule,
  node: ExportSpecifier,
  propertyName: string | Identifier | void,
  name: string | Identifier,
  isTypeOnly: boolean = false,
): ExportSpecifier {
  const [majorVersion, minorVersion] = ts.versionMajorMinor
    .split('.')
    .map(num => parseInt(num, 10));
  const propertyNameIdentifier =
    typeof propertyName === 'string'
      ? ts.createIdentifier(propertyName)
      : propertyName;
  const nameIdentifier =
    typeof name === 'string' ? ts.createIdentifier(name) : name;
  // The signature of updateExportSpecifier had a breaking change in Typescript 4.5.
  // see: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#type-modifiers-on-import-names
  if (majorVersion > 4 || (majorVersion === 4 && minorVersion >= 5)) {
    // prettier-ignore
    // $FlowFixMe[incompatible-call]
    // $FlowFixMe[extra-arg]
    return ts.updateExportSpecifier(node, isTypeOnly, propertyNameIdentifier, nameIdentifier);
  } else {
    return ts.updateExportSpecifier(
      node,
      propertyNameIdentifier,
      nameIdentifier,
    );
  }
}
