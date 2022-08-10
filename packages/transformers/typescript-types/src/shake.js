// @flow
import {TSModule} from './TSModule';
import type {TSModuleGraph} from './TSModuleGraph';

import ts from 'typescript';
import nullthrows from 'nullthrows';
import {getExportedName, isDeclaration, createImportSpecifier} from './utils';

export function shake(
  moduleGraph: TSModuleGraph,
  context: any,
  sourceFile: any,
): any {
  // We traverse things out of order which messes with typescript's internal state.
  // We don't rely on the lexical environment, so just overwrite with noops to avoid errors.
  context.suspendLexicalEnvironment = () => {};
  context.resumeLexicalEnvironment = () => {};

  // Propagate exports from the main module to determine what types should be included
  let exportedNames = moduleGraph.propagate(context);

  // When module definitions are nested inside each other (e.g with module augmentation),
  // we want to keep track of the hierarchy so we can associated nodes with the right module.
  const moduleStack: Array<?TSModule> = [];

  let addedGeneratedImports = false;

  let _currentModule: ?TSModule;
  let visit = (node: any): any => {
    if (ts.isBundle(node)) {
      return ts.updateBundle(node, ts.visitNodes(node.sourceFiles, visit));
    }

    // Flatten all module declarations into the top-level scope
    if (ts.isModuleDeclaration(node)) {
      // Deeply nested module declarations are assumed to be module augmentations and left alone.
      if (moduleStack.length >= 1) {
        // Since we are hoisting them to the top-level scope, we need to add a "declare" keyword to make them ambient.
        // we also want the declare keyword to come after the export keyword to guarantee a valid typings file.
        node.modifiers ??= [];
        const index =
          node.modifiers[0]?.kind === ts.SyntaxKind.ExportKeyword ? 1 : 0;
        node.modifiers.splice(
          index,
          0,
          ts.createModifier(ts.SyntaxKind.DeclareKeyword),
        );
        return node;
      }

      moduleStack.push(_currentModule);
      let isFirstModule = !_currentModule;
      _currentModule = moduleGraph.getModule(node.name.text);

      const visitedModuleContents = ts.visitEachChild(node, visit, context);
      const statements =
        getNamespaceExportsAndAliases(
          nullthrows(_currentModule),
          visitedModuleContents,
        ) ?? visitedModuleContents.body.statements;

      _currentModule = moduleStack.pop();

      if (isFirstModule && !addedGeneratedImports) {
        statements.unshift(...generateImports(moduleGraph));
        addedGeneratedImports = true;
      }

      return statements;
    }

    if (!_currentModule) {
      return ts.visitEachChild(node, visit, context);
    }

    // Remove inline imports. They are hoisted to the top of the output.
    if (ts.isImportDeclaration(node)) {
      return null;
    }

    let currentModule = nullthrows(_currentModule);
    if (ts.isExportDeclaration(node)) {
      if (currentModule.isTopLevelNamespaceExport) {
        if (!node.moduleSpecifier) {
          // Leve internal export statements alone
          // TODO: add test for this.
          return node;
        }
        const referencedModule = moduleGraph.getModule(
          node.moduleSpecifier.text,
        );
        if (!referencedModule) {
          // Leave external re-exports alone. TODO: maybe not? there's complicated logic here.
          return node;
        }
        if (node.exportClause) {
          // Transform export declarations in namespace modules with final names, and remove the module specifier. For example...
          //    export {foo as renamed, bar} from './other';
          //    ...might become...
          //    export { _foo1 as renamed, _bar1 };
          //    ...if foo and bar from "other" had to be renamed.
          const exported = node.exportClause.elements.map(exportSpecifier => {
            // TODO: what if "propertyName": were a qualified name? e.g. MyNamespace.Foo Is that even possible?
            if (exportSpecifier.propertyName) {
              const resolved = moduleGraph.resolveExport(
                referencedModule,
                exportSpecifier.propertyName.text,
              );
              if (resolved) {
                // TODO: when might this not resolve? Maybe for external modules? Definitely need handle this.
                // TODO: this has a 2 argument signature in TS 3.3 (flow definitions), but a 3 argument signature in recent versions of TS
                // prettier-ignore
                // $FlowFixMe[incompatible-call]
                // $FlowFixMe[extra-arg]
                return ts.updateExportSpecifier(exportSpecifier, exportSpecifier.isTypeOnly, ts.createIdentifier(referencedModule.getName(resolved.imported)), exportSpecifier.name);
              }
            }
            return exportSpecifier;
          });
          return ts.updateExportDeclaration(
            node,
            node.decorators, // decorators
            node.modifiers, // modifiers
            ts.updateNamedExports(node.exportClause, exported),
            undefined, // moduleSpecifier
          );
        } else {
          // Transform wildcard exports into named exports.
          //
          const allWildcardExports =
            moduleGraph.getAllExports(referencedModule);
          const wildcardExportSpecifiers = [];
          // TODO: can we do this in a more efficient way?
          const allNamedExports = new Set();
          for (const e of currentModule.exports) {
            allNamedExports.add(e.name);
          }
          for (const e of allWildcardExports) {
            // Named exports will win over wildcard export names.
            if (!allNamedExports.has(e.name)) {
              const imported = referencedModule.getName(e.imported);
              wildcardExportSpecifiers.push(
                // TODO: this has a 2 argument signature in TS 3.3 (flow definitions), but a 3 argument signature in recent versions of TS
                // prettier-ignore
                // $FlowFixMe[incompatible-call]
                // $FlowFixMe[extra-arg]
                ts.createExportSpecifier(false, imported !== e.name ? imported : undefined, e.name),
              );
            }
          }
          return ts.createExportDeclaration(
            undefined, // decorators
            undefined, // modifiers
            ts.createNamedExports(wildcardExportSpecifiers),
          );
        }
      }
      // Remove exports from flattened modules
      else if (
        !node.moduleSpecifier ||
        moduleGraph.getModule(node.moduleSpecifier.text)
      ) {
        if (!node.moduleSpecifier && node.exportClause) {
          // Filter exported elements to only external re-exports
          let exported = [];
          for (let element of node.exportClause.elements) {
            let name = (element.propertyName ?? element.name).text;
            if (
              exportedNames.get(name) === currentModule &&
              !currentModule.hasBinding(name)
            ) {
              exported.push(element);
            }
          }

          if (exported.length > 0) {
            return ts.updateExportDeclaration(
              node,
              undefined, // decorators
              undefined, // modifiers
              ts.updateNamedExports(node.exportClause, exported),
              undefined, // moduleSpecifier
            );
          }
        }

        return null;
      }
    }

    if (ts.isExportAssignment(node)) {
      // For namespace modules, transform "export default x" to "export {x as default}"
      if (currentModule.isTopLevelNamespaceExport && !node.isExportEquals) {
        const namedExport = ts.createNamedExports([
          // TODO: this has a 2 argument signature in TS 3.3 (flow definitions), but a 3 argument signature in recent versions of TS
          // prettier-ignore
          // $FlowFixMe[incompatible-call]
          // $FlowFixMe[extra-arg]
          ts.createExportSpecifier(false, ts.createIdentifier(currentModule.getName(node.expression.text)), ts.createIdentifier('default')),
        ]);
        // TODO: flow definition does not include "boolean" as 3rd parameter, but ts-ast-viewer suggests that it should.
        return ts.createExportDeclaration(undefined, undefined, namedExport);
      }
      // Otherwise, remove export assignment if unused.
      let name = currentModule.getName('default');
      if (exportedNames.get(name) !== currentModule) {
        return null;
      }
    }

    if (isDeclaration(ts, node)) {
      const exportedName = getExportedName(ts, node);
      let name = exportedName || node.name.text;

      // Remove unused declarations
      if (!currentModule.used.has(name)) {
        return null;
      }

      // Rename declarations
      node = ts.getMutableClone(node);
      let newName = currentModule.getName(name);
      if (newName !== name && newName !== 'default') {
        node.name = ts.createIdentifier(newName);
      }

      if (currentModule.isTopLevelNamespaceExport) {
        // In general, declarations in a namespace should be left alone. However, if an export has to be renamed due to a conflict,
        // then we want to instead declare the local (renamed) function/class/etc. and export it with the original name, e.g.
        //    export function foo: string --> function _foo1: string; export { _foo1 as foo };
        // TODO: exportedName might be "default" - need to handle this.
        if (exportedName !== newName) {
          node.modifiers = node.modifiers.filter(
            m => m.kind !== ts.SyntaxKind.ExportKeyword,
          );
          const renamedExports = ts.createNamedExports([
            // TODO: this has a 2 argument signature in TS 3.3 (flow definitions), but a 3 argument signature in recent versions of TS
            // $FlowFixMe[incompatible-call]
            // $FlowFixMe[extra-arg]
            ts.createExportSpecifier(false, newName, name),
          ]);
          return [
            ts.visitEachChild(node, visit, context),
            // TODO: flow definition does not include "boolean" as 3rd parameter, but ts-ast-viewer suggests that it should.
            ts.createExportDeclaration(undefined, undefined, renamedExports),
          ];
        }
      } else {
        // Remove original export modifiers
        node.modifiers = (node.modifiers || []).filter(
          m =>
            m.kind !== ts.SyntaxKind.ExportKeyword &&
            m.kind !== ts.SyntaxKind.DefaultKeyword,
        );

        // Export declarations that should be exported
        if (exportedNames.get(newName) === currentModule) {
          if (newName === 'default') {
            node.modifiers.unshift(
              ts.createModifier(ts.SyntaxKind.DefaultKeyword),
            );
          }

          node.modifiers.unshift(
            ts.createModifier(ts.SyntaxKind.ExportKeyword),
          );
        } else if (
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node)
        ) {
          node.modifiers.unshift(
            ts.createModifier(ts.SyntaxKind.DeclareKeyword),
          );
        }
      }
    }

    if (ts.isVariableStatement(node)) {
      if (currentModule.isTopLevelNamespaceExport) {
        // If we're exporting from a namespace, and the export had to be renamed due to a conflict,
        // then we want to instead declare the local (renamed) variable and export it with the original name, e.g.
        //    export const foo: string --> const _foo1: string; export { _foo1 as foo };
        if (
          // There are any declarations that have been renamed.
          node.declarationList.declarations.some(
            d => currentModule.getName(d.name.text) !== d.name.text,
          ) &&
          // The declaration is exported.
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          node.modifiers = node.modifiers.filter(
            m => m.kind !== ts.SyntaxKind.ExportKeyword,
          );
          const renamedExports = ts.createNamedExports(
            node.declarationList.declarations.map(({name}) =>
              // TODO: this has a 2 argument signature in TS 3.3 (flow definitions), but a 3 argument signature in recent versions of TS
              // prettier-ignore
              // $FlowFixMe[incompatible-call]
              // $FlowFixMe[extra-arg]
              ts.createExportSpecifier(false, currentModule.getName(name.text), name),
            ),
          );
          return [
            ts.visitEachChild(node, visit, context),
            // TODO: flow definition does not include "boolean" as 3rd parameter, but ts-ast-viewer suggests that it should.
            ts.createExportDeclaration(undefined, undefined, renamedExports),
          ];
        }
        // Otherwise, namespace variable exports should be left alone.
        return ts.visitEachChild(node, visit, context);
      }

      node = ts.visitEachChild(node, visit, context);

      // Remove empty variable statements
      if (node.declarationList.declarations.length === 0) {
        return null;
      }

      // Remove original export modifiers
      node.modifiers = (node.modifiers || []).filter(
        m =>
          m.kind !== ts.SyntaxKind.ExportKeyword &&
          m.kind !== ts.SyntaxKind.DeclareKeyword,
      );

      // Add export modifier if all declarations are exported.
      let isExported = node.declarationList.declarations.every(
        d => exportedNames.get(d.name.text) === currentModule,
      );
      if (isExported) {
        node.modifiers.unshift(ts.createModifier(ts.SyntaxKind.ExportKeyword));
      } else {
        // Otherwise, add `declare` modifier (required for top-level declarations in d.ts files).
        node.modifiers.unshift(ts.createModifier(ts.SyntaxKind.DeclareKeyword));
      }

      return node;
    }

    if (ts.isVariableDeclaration(node)) {
      // Remove unused variables
      if (!currentModule.used.has(node.name.text)) {
        return null;
      }
    }

    // Rename references
    if (ts.isIdentifier(node) && currentModule.names.has(node.text)) {
      let newName = nullthrows(currentModule.getName(node.text));
      if (newName !== 'default') {
        return ts.createIdentifier(newName);
      }
    }

    // Replace namespace references with final names
    if (ts.isQualifiedName(node) && ts.isIdentifier(node.left)) {
      let resolved = moduleGraph.resolveImport(
        currentModule,
        node.left.text,
        node.right.text,
      );

      if (resolved && resolved.module.primaryNamespaceName) {
        // If the qualifier references a namespace export that will be exported at the top level, replace it with the "primary" namespace name.
        return ts.updateQualifiedName(
          node,
          ts.createIdentifier(resolved.module.primaryNamespaceName),
          node.right,
        );
      } else if (resolved && resolved.module.hasBinding(resolved.imported)) {
        return ts.createIdentifier(resolved.module.getName(resolved.imported));
      } else {
        return ts.updateQualifiedName(
          node,
          ts.createIdentifier(currentModule.getName(node.left.text)),
          node.right,
        );
      }
    }

    // Remove private properties
    if (ts.isPropertyDeclaration(node)) {
      let isPrivate =
        node.modifiers &&
        node.modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword);
      if (isPrivate) {
        return null;
      }
    }

    return ts.visitEachChild(node, visit, context);
  };

  return ts.visitNode(sourceFile, visit);
}

function generateImports(moduleGraph: TSModuleGraph) {
  let importStatements = [];
  for (let [specifier, names] of moduleGraph.getAllImports()) {
    let defaultSpecifier;
    let namespaceSpecifier;
    let namedSpecifiers = [];
    for (let [name, imported] of names) {
      if (imported === 'default') {
        defaultSpecifier = ts.createIdentifier(name);
      } else if (imported === '*') {
        namespaceSpecifier = ts.createNamespaceImport(
          ts.createIdentifier(name),
        );
      } else {
        namedSpecifiers.push(
          createImportSpecifier(
            ts,
            name === imported ? undefined : ts.createIdentifier(imported),
            ts.createIdentifier(name),
          ),
        );
      }
    }

    if (namespaceSpecifier) {
      let importClause = ts.createImportClause(
        defaultSpecifier,
        namespaceSpecifier,
      );
      importStatements.push(
        ts.createImportDeclaration(
          undefined,
          undefined,
          importClause,
          // $FlowFixMe
          ts.createLiteral(specifier),
        ),
      );
      defaultSpecifier = undefined;
    }

    if (defaultSpecifier || namedSpecifiers.length > 0) {
      let importClause = ts.createImportClause(
        defaultSpecifier,
        namedSpecifiers.length > 0
          ? ts.createNamedImports(namedSpecifiers)
          : undefined,
      );
      importStatements.push(
        ts.createImportDeclaration(
          undefined,
          undefined,
          importClause,
          // $FlowFixMe
          ts.createLiteral(specifier),
        ),
      );
    }
  }

  return importStatements;
}

function getNamespaceExportsAndAliases(
  m: TSModule,
  visitedModuleDeclaration: any,
): any {
  const {primaryNamespaceName} = m;
  if (primaryNamespaceName) {
    // The primary namespace name contains the module contents, e.g. export namespace MyNamespace { ... }.
    const namespaceDeclarationAndAliases = [
      ts.createModuleDeclaration(
        undefined, // decorators
        ts.createModifiersFromModifierFlags(ts.ModifierFlags.Export), // modifiers
        ts.createIdentifier(primaryNamespaceName), // name
        ts.createModuleBlock(visitedModuleDeclaration.body.statements), // body
        ts.NodeFlags.Namespace, // flags
      ),
    ];

    // Subsequent exported namespace names are "aliases", e.g. export { MyNamespace as NamespaceAlias };
    for (const namespaceName of m.namespaceNames) {
      if (namespaceName !== primaryNamespaceName) {
        namespaceDeclarationAndAliases.push(
          ts.createExportDeclaration(
            undefined,
            undefined,
            ts.createNamedExports([
              // TODO: this has a 2 argument signature in TS 3.3 (flow definitions), but a 3 argument signature in recent versions of TS
              // prettier-ignore
              // $FlowFixMe[incompatible-call]
              // $FlowFixMe[extra-arg]
              ts.createExportSpecifier(false, primaryNamespaceName, namespaceName),
            ]),
            undefined,
          ),
        );
      }
    }
    return namespaceDeclarationAndAliases;
  }
  return null;
}
