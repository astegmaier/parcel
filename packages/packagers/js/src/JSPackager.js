// @flow strict-local

import invariant from 'assert';
import {Packager} from '@parcel/plugin';
import fs from 'fs';
import {concat, link, generate} from '@parcel/scope-hoisting';
import SourceMap from '@parcel/source-map';
import {countLines, PromiseQueue} from '@parcel/utils';
import path from 'path';

const PRELUDE = fs
  .readFileSync(__dirname + '/prelude.js', 'utf8')
  .trim()
  .replace(/;$/, '');

export default new Packager({
  async package({bundle, bundleGraph, sourceMapPath, options}) {
    // If scope hoisting is enabled, we use a different code path.
    if (options.scopeHoist) {
      let ast = await concat(bundle, bundleGraph);
      ast = link({bundle, bundleGraph, ast, options});
      return generate(bundle, ast, options);
    }

    // For development, we just concatenate all of the code together
    // rather then enabling scope hoisting, which would be too slow.
    let codeQueue = new PromiseQueue({maxConcurrent: 32});
    let mapQueue = new PromiseQueue({maxConcurrent: 32});
    bundle.traverse(node => {
      if (node.type === 'asset') {
        codeQueue.add(() => node.value.getCode());
        mapQueue.add(() => node.value.getMap());
      }
    });

    let [code, maps] = await Promise.all([codeQueue.run(), mapQueue.run()]);

    let assets = '';
    let i = 0;
    let first = true;
    let map = new SourceMap();
    let lineOffset = countLines(PRELUDE);

    let stubsWritten = new Set();
    bundle.traverse(node => {
      let wrapped = first ? '' : ',';

      if (node.type === 'dependency') {
        let resolved = bundleGraph.getDependencyResolution(node.value);
        if (
          resolved &&
          resolved.type !== 'js' &&
          !stubsWritten.has(resolved.id)
        ) {
          // if this is a reference to another javascript asset, we should not include
          // its output, as its contents should already be loaded.
          // invariant(
          //   !bundle.hasAsset(resolved),
          //   `Expected JS bundle ${
          //     bundle.name
          //   } to only contain JS, but contained ${resolved.filePath}`
          // );
          wrapped += JSON.stringify(resolved.id) + ':[function() {},{}]';
        } else {
          return;
        }
      }

      if (node.type === 'asset') {
        let asset = node.value;
        invariant(
          asset.type === 'js',
          'all assets in a js bundle must be js assets'
        );

        let deps = {};
        let dependencies = bundleGraph.getDependencies(asset);
        for (let dep of dependencies) {
          let resolved = bundleGraph.getDependencyResolution(dep);
          if (resolved) {
            deps[dep.moduleSpecifier] = resolved.id;
          }
        }

        let output = code[i] || '';
        wrapped +=
          JSON.stringify(asset.id) +
          ':[function(require,module,exports) {\n' +
          output +
          '\n},';
        wrapped += JSON.stringify(deps);
        wrapped += ']';

        if (options.sourceMaps) {
          let assetMap =
            maps[i] ??
            SourceMap.generateEmptyMap(
              path
                .relative(options.projectRoot, asset.filePath)
                .replace(/\\+/g, '/'),
              output
            );

          map.addMap(assetMap, lineOffset);
          lineOffset += countLines(output) + 1;
        }
        i++;
      }

      assets += wrapped;
      first = false;
    });

    let entries = bundle.getEntryAssets();
    let entryAsset = entries[entries.length - 1];
    // $FlowFixMe
    let interpreter: ?string = bundle.target.env.isBrowser()
      ? null
      : entryAsset.meta.interpreter;

    return {
      contents:
        // If the entry asset included a hashbang, repeat it at the top of the bundle
        (interpreter != null ? `#!${interpreter}\n` : '') +
        (PRELUDE +
          '({' +
          assets +
          '},{},' +
          JSON.stringify(entries.map(asset => asset.id)) +
          ', ' +
          'null' +
          ')\n\n' +
          '//# sourceMappingURL=' +
          sourceMapPath +
          '\n'),
      map
    };
  }
});