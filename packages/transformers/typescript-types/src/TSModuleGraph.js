// @flow
import type {TSModule, Export} from './TSModule';

import nullthrows from 'nullthrows';
import invariant from 'assert';
import ts from 'typescript';

export class TSModuleGraph {
  modules: Map<string, TSModule>;
  mainModuleName: string;
  mainModule: ?TSModule;

  constructor(mainModuleName: string) {
    this.modules = new Map();
    this.mainModuleName = mainModuleName;
    this.mainModule = null;
  }

  addModule(name: string, module: TSModule) {
    this.modules.set(name, module);
    if (name === this.mainModuleName) {
      this.mainModule = module;
    }
  }

  getModule(name: string): ?TSModule {
    return this.modules.get(name);
  }

  markUsed(module: TSModule, name: string, context: any): void {
    // If name is imported, mark used in the original module
    if (module.imports.has(name)) {
      module.used.add(name);
      let resolved = this.resolveImport(module, name);
      // Missing or external
      if (!resolved || resolved.module === module) {
        return;
      }

      // Namespace imports should be ignored - we care about marking used the things _inside_ the namespace import, instead of the whole namespace (e.g. 'foo' in 'MyNamepsace.foo')
      if (resolved.imported !== '*') {
        return this.markUsed(resolved.module, resolved.imported, context);
      }
    }

    if (module.used.has(name)) {
      return;
    }

    module.used.add(name);

    // Visit all child nodes of the original binding and mark any referenced types as used.
    let visit = (node: any) => {
      if (ts.isQualifiedName(node) && ts.isIdentifier(node.left)) {
        let resolved = this.resolveImport(
          module,
          node.left.text,
          node.right.text,
        );
        if (resolved) {
          this.markUsed(resolved.module, resolved.imported, context);
        }
      } else if (ts.isIdentifier(node)) {
        this.markUsed(module, node.text, context);
      }

      return ts.visitEachChild(node, visit, context);
    };

    let bindings = module.bindings.get(name);
    if (bindings) {
      for (let node of bindings) {
        ts.visitEachChild(node, visit, context);
      }
    }
  }

  getExport(
    m: TSModule,
    e: Export,
  ): ?{|imported: string, module: TSModule, name: string|} {
    invariant(e.name != null);
    let exportName = e.name;

    // Re-export
    if (e.specifier && e.imported) {
      let m = this.getModule(e.specifier);
      if (!m) {
        return null;
      }

      // Namespace re-export
      if (e.imported === '*') {
        return {module: m, imported: '*', name: exportName};
      }

      let exp = this.resolveExport(m, e.imported);
      if (!exp) {
        return null;
      }

      return {
        module: exp.module,
        imported: exp.imported || exp.name,
        name: exportName,
      };
    }

    // Import and then export
    if (m.imports.has(exportName)) {
      let imp = this.resolveImport(m, exportName);
      if (!imp) {
        return null;
      }

      return {
        module: imp.module,
        imported: imp.imported === '*' ? '*' : imp.name,
        name: exportName,
      };
    }

    // Named export
    return {
      module: m,
      name: exportName,
      imported: e.imported || exportName,
    };
  }

  resolveImport(
    module: TSModule,
    local: string,
    imported?: string,
  ): ?{|imported: string, module: TSModule, name: string|} {
    let i = module.imports.get(local);
    if (!i) {
      return null;
    }

    let m = this.getModule(i.specifier);
    if (!m) {
      // External module. pass through the import.
      return {module, name: local, imported: imported || i.imported};
    }

    // Namepsace imports in this module.
    // TODO: maybe adjust the order here so we handle external namepsaces?
    if (i.imported === '*' && !imported) {
      return {module: m, name: local, imported: '*'};
    }

    let resolved = this.resolveExport(m, imported || i.imported, i.imported);
    if (resolved?.imported === '*' && imported) {
      // If 'resolved' is a namespace, but resolveImport was asked to resolve a qualified name (e.g. MyNamespace.foo), then we need to resolve 'foo' _within_ 'MyNamespace'
      resolved = this.resolveExport(resolved.module, imported);
    }
    return resolved;
  }

  resolveExport(
    module: TSModule,
    name: string,
    namespace?: string,
  ): ?{|imported: string, module: TSModule, name: string|} {
    let wildcardExports = [];
    for (let e of module.exports) {
      if (
        e.name === name || // Named exports in this module
        (e.imported === '*' && e.name === namespace) // Namepsace exports in this module (e.g. export * as Name from "other-module")
      ) {
        return this.getExport(module, e);
      } else if (e.specifier && !e.name) {
        // Only look inside wildcard export names if we don't find a named export.
        wildcardExports.push(e.specifier);
      }
    }
    for (const specifier of wildcardExports) {
      const m = this.resolveExport(nullthrows(this.getModule(specifier)), name);
      if (m) {
        return m;
      }
    }
  }

  getAllExports(
    module: TSModule = nullthrows(this.mainModule),
    excludeDefault: boolean = false,
  ): Iterator<{|imported: string, module: TSModule, name: string|}> {
    let res = new Map();
    for (let e of module.exports) {
      if (e.name && (!excludeDefault || e.name !== 'default')) {
        let exp = this.getExport(module, e);
        if (exp) {
          res.set(exp.name, exp);
        }
      } else if (e.specifier) {
        let m = this.getModule(e.specifier);
        if (m) {
          const allWildcardExports = this.getAllExports(m, true);
          for (let exp of allWildcardExports) {
            // Contents of modules exported through a wildcard that conflict with a named export in this module
            // will get over-ridden at runtime by the named export, so we don't want to include them.
            if (res.has(exp.name)) {
              continue;
            }
            res.set(exp.name, exp);
          }
        }
      }
    }
    return res.values();
  }

  getAllImports(): Map<string, Map<string, string>> {
    // Build a map of all imports for external modules
    let importsBySpecifier: Map<string, Map<string, string>> = new Map();
    for (let module of this.modules.values()) {
      for (let [name, imp] of module.imports) {
        if (module.used.has(name) && !this.modules.has(imp.specifier)) {
          let importMap = importsBySpecifier.get(imp.specifier);
          if (!importMap) {
            importMap = new Map();
            importsBySpecifier.set(imp.specifier, importMap);
          }

          name = module.getName(name);
          importMap.set(name, imp.imported);
        }
      }
    }

    return importsBySpecifier;
  }

  propagate(context: any): Map<string, TSModule> {
    // Resolve all exported values, and mark them as used.
    let names = Object.create(null);
    let exportedNames = new Map<string, TSModule>();
    for (let e of this.getAllExports()) {
      // Namespace exports (e.g. export * as NamespaceName from 'module')
      if (e.imported === '*') {
        if (e.module.namespaceNames.size === 0) {
          for (let exp of this.getAllExports(e.module)) {
            // TODO: what if one of "exp" is also a namespace export?
            this.markUsed(exp.module, exp.imported, context); // All the exports of the namespace need to be present.
            // e.module.names.set(exp.imported, exp.name); // TODO: is this necessary?
          }
        }
        e.module.namespaceNames.add(e.name);
        names[e.name] = 1; // Only "NamespaceName" is global, not its contents.
      }
      // Named exports
      else {
        this.markUsed(e.module, e.imported, context);
        e.module.names.set(e.imported, e.name);
        names[e.name] = 1;
        exportedNames.set(e.name, e.module);
      }
    }

    let importedSymbolsToUpdate = [];

    // Assign unique names across all modules
    for (let m of this.modules.values()) {
      if (!m.isTopLevelNamespaceExport) {
        for (let [orig, name] of m.names) {
          if (exportedNames.has(name) && exportedNames.get(name) === m) {
            continue;
          }

          if (!m.used.has(orig)) {
            continue;
          }

          if (m.imports.has(orig)) {
            // Update imports after all modules's local variables have been renamed
            importedSymbolsToUpdate.push([m, orig]);
            continue;
          }

          if (names[name]) {
            m.names.set(name, `_${name}${names[name]++}`);
          } else {
            names[name] = 1;
          }
        }
      }
    }

    // TODO: could we do this more efficiently? Maybe create an namespaceModules array when iterating the first time?
    for (let m of this.modules.values()) {
      if (m.isTopLevelNamespaceExport) {
        // Aliased imports might conflict with namespace-scoped names/exports
        // Example: "import { foo as bar } from './other'" might conflict with "export const foo = ..." within the namespace
        // TODO: we probably don't need to build data strucutre - it could be done only as needed with a quick check.
        const aliasedImports = new Set();
        for (const [alias, i] of m.imports) {
          if (alias !== i.imported) {
            aliasedImports.add(i.imported);
          }
        }

        // Any kind of re-export might conflict with local namespace-scoped name.
        // Example: "export { foo } from './other'"" might conflict with a "const foo = ..." defined within the namespace.
        // Example: "export * from "./other2" might result in an "export { bar }" statement being inserted into the final output,
        //          which could conflict with a local "const bar = ..." defined within the namespace.
        // TODO: could this call to getAllExports be combined with the same call above?
        const reExportNames = new Set();
        for (const e of this.getAllExports(m)) {
          // Example m:
          // export { default as dRenamed } from './other'
          // ...becomes...
          // { module: [TSModule for "other.ts"], imported: 'd', name: 'dRenamed', namespaceModule: undefined },
          if (e.module !== m) {
            reExportNames.add(e.module.getName(e.imported));
          }
        }

        const namespaceNames = Object.create(null);
        for (let [orig, name] of m.names) {
          // TODO: is this necesary? I think we marked everything as used, no?
          if (!m.used.has(orig)) {
            continue;
          }

          // TODO: is this necessary?
          if (m.imports.has(orig)) {
            // Update imports after all modules's local variables have been renamed
            importedSymbolsToUpdate.push([m, orig]);
            continue;
          }

          if (aliasedImports.has(name) || reExportNames.has(name)) {
            if (!namespaceNames[name]) {
              namespaceNames[name] = names[name];
            }
            m.names.set(name, `_${name}${namespaceNames[name]++}`);
          }
        }
      }
    }

    // Map of imported specifiers -> map of imported names to local names
    let imports = new Map();

    for (let [m, orig] of importedSymbolsToUpdate) {
      let imp = nullthrows(m.imports.get(orig));
      let imported = nullthrows(this.resolveImport(m, orig));

      // If the module is bundled, map the local name to the original exported name.
      if (this.modules.has(imp.specifier)) {
        // If the import is from a namespace module, add the namespace specifier.
        const {primaryNamespaceName} = imported.module;
        const name = imported.module.getName(imported.imported);
        if (primaryNamespaceName) {
          m.names.set(orig, `${primaryNamespaceName}.${name}`);
          continue;
        }
        m.names.set(orig, name);
        continue;
      }

      // If it's external, then we need to dedup duplicate imported names, and ensure
      // that they do not conflict with any exported or local names.
      let importedNames = imports.get(imp.specifier);
      if (!importedNames) {
        importedNames = new Map();
        imports.set(imp.specifier, importedNames);
      }

      let name = importedNames.get(imported.imported);
      if (!name) {
        if (names[imported.imported]) {
          name = `_${imported.imported}${names[imported.imported]++}`;
        } else {
          name = imported.imported;
          names[imported.imported] = 1;
        }

        importedNames.set(imported.imported, name);
      }

      m.names.set(orig, name);
    }

    return exportedNames;
  }
}
