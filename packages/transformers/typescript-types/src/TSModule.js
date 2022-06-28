// @flow

export type Import = {|specifier: string, imported: string|};
export type Export =
  | {|name: string, imported: string, specifier?: ?string|}
  | {|specifier: string|};

export class TSModule {
  imports: Map<string, Import>;
  exports: Array<Export>;
  bindings: Map<string, Set<any>>;
  names: Map<string, string>;
  used: Set<string>;
  /** export * as name from "specifier" => Map<name, specifier> */
  namespaceExports: Map<string, string>;
  /** The raw module contents */
  node: any;

  constructor(node: any) {
    this.imports = new Map();
    this.exports = [];
    this.bindings = new Map();
    this.names = new Map();
    this.used = new Set();
    this.namespaceExports = new Map();
    this.node = node;
  }

  addImport(local: string, specifier: string, imported: string) {
    this.imports.set(local, {specifier, imported});
    if (imported !== '*' && imported !== 'default') {
      this.names.set(local, local);
    }
  }

  // if not a reexport: imported = local, name = exported
  addExport(name: string, imported: string, specifier: ?string) {
    this.exports.push({name, specifier, imported});
  }

  addNamespaceExport(name: string, specifier: string) {
    this.namespaceExports.set(name, specifier);
  }

  addWildcardExport(specifier: string) {
    this.exports.push({specifier});
  }

  addLocal(name: string, node: any) {
    const bindings = this.bindings.get(name) ?? new Set();
    bindings.add(node);
    this.bindings.set(name, bindings);
    if (name !== 'default') {
      this.names.set(name, name);
    }
  }

  getName(name: string): string {
    return this.names.get(name) || name;
  }

  hasBinding(name: string): boolean {
    return this.bindings.has(name);
  }
}
