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
  namespaceNames: Set<string>;

  constructor() {
    this.imports = new Map();
    this.exports = [];
    this.bindings = new Map();
    this.names = new Map();
    this.used = new Set();
    this.namespaceNames = new Set();
  }

  /** Whether the module should be exported in the bundle as "export namespace MyNamespace {...}" instead of being flattened. */
  get isTopLevelNamespaceExport(): boolean {
    return this.namespaceNames.size > 0;
  }

  /**
   * The namespace name that will ultiamtely contain the module contents. e.g. "export namespace MyNamespace {...}".
   * Other names are "aliases" that will be exported as "export { MyNamespace as MyNamespaceAlias }"
   */
  get primaryNamespaceName(): string | null {
    return this.namespaceNames.values().next()?.value ?? null;
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

  addWildcardExport(specifier: string) {
    this.exports.push({specifier});
  }

  addNamespaceExport(name: string, specifier: string) {
    this.exports.push({name, specifier, imported: '*'});
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
