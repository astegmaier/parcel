// @flow
import {TSModule} from './TSModule';
import type {TSModuleGraph} from './TSModuleGraph';

import ts from 'typescript';
import nullthrows from 'nullthrows';
import {
  getExportedName,
  isDeclaration,
  isTypeDeclaration,
  createImportSpecifier,
  createExportSpecifier,
  updateExportSpecifier,
} from './utils';

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
        // Namespace exports (e.g. `export * foo from './bar'`)
        if (
          node.exportClause &&
          // $FlowFixMe[prop-missing] - "isNamespaceExport" was added in Typescript 3.8 and is not present in the current flow definitions.
          typeof ts.isNamespaceExport === 'function' &&
          ts.isNamespaceExport(node.exportClause)
        ) {
          // TODO: handle this case.
          // We'll want to transform "export * as NestedNamespace" to "export {TopLevelNamepsaceName as NestedNamespace}"
          // This means we need to consider name conflicts between "TopLevelNamepsaceName" and names within the current namespace.
          // It also introduces the case of namespaces aren't actually exported at the top level, but still need to be wrapped in "declare namespace {}"
          return node;
        }
        // Named exports (e.g. export { foo as bar } from "./baz")
        else if (node.exportClause?.elements) {
          // Transform export declarations in namespace modules with final names, and remove the module specifier. For example...
          //    export {foo as renamed, bar} from './other';
          //    ...might become...
          //    export { _foo1 as renamed, _bar1 };
          //    ...if foo and bar from "other" had to be renamed.
          const exported = node.exportClause.elements.map(exportSpecifier => {
            const resolved = moduleGraph.resolveExport(
              currentModule,
              exportSpecifier.name.text,
            );
            if (!resolved) {
              // Leave external re-exports alone. TODO: maybe not? there's complicated logic here.
              // TODO: is this the only case where resolved will be falsy? Is it even falsy in this case?
              return node;
            }
            const newPropertyName =
              resolved.module.primaryNamespaceName ??
              resolved.module.getName(resolved.imported);
            return updateExportSpecifier(
              ts,
              exportSpecifier,
              // If no-renaming is needed, don't add a duplicate propertyName (e.g. don't do "export { foo as foo }")
              newPropertyName === exportSpecifier.name.text
                ? undefined
                : newPropertyName,
              exportSpecifier.name,
              exportSpecifier.isTypeOnly,
            );
          });
          return ts.updateExportDeclaration(
            node,
            node.decorators, // decorators
            node.modifiers, // modifiers
            ts.updateNamedExports(node.exportClause, exported),
            undefined, // moduleSpecifier
          );
        }
        // Wildcard exports (e.g. export * from "./foo")
        else {
          // Transform wildcard exports into named exports.
          const referencedModule = moduleGraph.getModule(
            node.moduleSpecifier?.text,
          );
          if (!referencedModule) {
            // Leave external re-exports alone.
            return node; // TODO: is this right? We do the same thing above for named exports.
          }
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
                createExportSpecifier(
                  ts,
                  imported !== e.name ? imported : undefined,
                  e.name,
                ),
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
          createExportSpecifier(
            ts,
            currentModule.getName(node.expression.text),
            'default',
          ),
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
            createExportSpecifier(
              ts,
              newName,
              name,
              isTypeDeclaration(ts, node),
            ),
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
              createExportSpecifier(ts, currentModule.getName(name.text), name),
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

    // Rename qualified names
    if (ts.isQualifiedName(node)) {
      const {qualifier, name} = resolveQualifiedName(
        currentModule,
        moduleGraph,
        node,
      );
      if (qualifier) {
        return ts.createQualifiedName(
          ts.createIdentifier(qualifier),
          ts.createIdentifier(name),
        );
      } else {
        return ts.createIdentifier(name);
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
              createExportSpecifier(ts, primaryNamespaceName, namespaceName),
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

/**
 * Recursively resolves potentially nested qualified names.
 * We want to transoform deeply nested qualified names (e.g. foo.bar.baz)
 * into something with a single qualifier, which might be renamed (barRenamed.baz).
 * @example `foo.bar.baz` would be represented as:
 *   {
 *     kind: QualifiedName,
 *     left: {
 *       kind: QualifiedName,
 *       left: { kind: Identifier, text: 'foo' },
 *       right: { kind: Identifier, text: 'bar' }
 *     },
 *     right: { kind: Identifier, text: 'baz'}
 *   }
 */
function resolveQualifiedName(
  qualifiedNameModule: TSModule, // The module that contains the qualified name.
  moduleGraph: TSModuleGraph,
  node: any,
  module?: ?TSModule, // When recursively resolving multi-part qualified names, this is the module where we should look for exports.
): {|name: string, qualifier?: string, module: TSModule|} {
  module = module ?? qualifiedNameModule;
  const name: string = node.right.text;
  let qualifier: ?string;
  if (ts.isIdentifier(node.left)) {
    qualifier = node.left.text;
  } else {
    ({qualifier, module} = resolveQualifiedName(
      qualifiedNameModule,
      moduleGraph,
      node.left,
      module,
    ));
  }

  // TODO: add a test that hits this case: a deeply qualified name that terminates on a non-namespace export.
  if (!qualifier) {
    return {name, module};
  }

  const resolved =
    qualifiedNameModule === module
      ? moduleGraph.resolveImport(module, qualifier, name)
      : moduleGraph.resolveExport(module, name);

  if (resolved && resolved.module.primaryNamespaceName) {
    // If the qualifier references a namespace export that will be exported at the top level, replace it with the "primary" namespace name.
    return {
      qualifier: resolved.module.primaryNamespaceName,
      name,
      module: resolved.module,
    };
  } else if (resolved && resolved.module.hasBinding(resolved.imported)) {
    return {
      name: resolved.module.getName(resolved.imported),
      module: resolved.module,
    };
  } else {
    // TODO: will this work for external namepsace names?
    return {
      qualifier: module.getName(qualifier),
      name,
      module: resolved?.module ?? module,
    };
  }
}
