import assert from 'assert';
import path from 'path';
import {
  assertBundles,
  bundle,
  inputFS,
  overlayFS,
  outputFS,
  ncp,
} from '@parcel/test-utils';

describe('typescript types', function () {
  it('should generate a typescript declaration file', async function () {
    let b = await bundle(
      path.join(__dirname, '/integration/ts-types/main/index.ts'),
    );

    assertBundles(b, [
      {
        type: 'js',
        assets: ['index.ts'],
      },
      {
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(__dirname, '/integration/ts-types/main/dist/types.d.ts'),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(__dirname, '/integration/ts-types/main/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with imports', async function () {
    let b = await bundle(
      path.join(__dirname, '/integration/ts-types/importing/index.ts'),
    );

    assertBundles(b, [
      {
        type: 'js',
        assets: ['index.ts', 'namespace.ts'],
      },
      {
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(__dirname, '/integration/ts-types/importing/dist/types.d.ts'),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(__dirname, '/integration/ts-types/importing/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with imports and naming collisions', async function () {
    let b = await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/importing-collision/index.ts',
      ),
    );

    assertBundles(b, [
      {
        type: 'js',
        assets: ['index.ts', 'other1.ts', 'other2.ts'],
      },
      {
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/importing-collision/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/importing-collision/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with exports', async function () {
    let b = await bundle(
      path.join(__dirname, '/integration/ts-types/exporting/index.ts'),
    );

    assertBundles(b, [
      {
        type: 'js',
        assets: ['index.ts', 'message.ts', 'other.ts', 'test.ts'],
      },
      {
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(__dirname, '/integration/ts-types/exporting/dist/types.d.ts'),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(__dirname, '/integration/ts-types/exporting/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with export of an overloaded function signature', async function () {
    let b = await bundle(
      path.join(__dirname, '/integration/ts-types/exporting-overload/index.ts'),
    );

    assertBundles(b, [
      {
        type: 'js',
        assets: ['index.ts'],
      },
      {
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/exporting-overload/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-overload/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with externals', async function () {
    let b = await bundle(
      path.join(__dirname, '/integration/ts-types/externals/index.tsx'),
    );

    assertBundles(b, [
      {
        type: 'js',
        assets: ['index.tsx', 'other.tsx'],
      },
      {
        type: 'ts',
        assets: ['index.tsx'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(__dirname, '/integration/ts-types/externals/dist/types.d.ts'),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(__dirname, '/integration/ts-types/externals/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with externals that conflict with exported names', async function () {
    let b = await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/import-export-collision/index.ts',
      ),
    );

    assertBundles(b, [
      {
        type: 'js',
        assets: ['index.ts'],
      },
      {
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/import-export-collision/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/import-export-collision/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should remove private properties', async function () {
    await bundle(
      path.join(__dirname, '/integration/ts-types/private/index.ts'),
    );

    let dist = (
      await outputFS.readFile(
        path.join(__dirname, '/integration/ts-types/private/dist/types.d.ts'),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(__dirname, '/integration/ts-types/private/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should not throw errors on typing of a callback which returns a promise or value', async function () {
    await bundle(
      path.join(__dirname, '/integration/ts-types/promise-or-value/index.ts'),
    );

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/promise-or-value/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');

    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/promise-or-value/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should correctly reference unbuilt monorepo packages', async function () {
    let fixtureDir = path.join(__dirname, 'integration/ts-types/monorepo');
    await outputFS.mkdirp(path.join(fixtureDir, 'node_modules'));
    await ncp(fixtureDir, fixtureDir);
    await outputFS.symlink(
      path.join(fixtureDir, 'b'),
      path.join(fixtureDir, 'node_modules/b'),
    );

    let b = await bundle(path.join(fixtureDir, 'a'), {
      inputFS: overlayFS,
    });
    assertBundles(b, [
      {
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(b.getBundles()[0].filePath, 'utf8')
    ).replace(/\r\n/g, '\n');

    assert(/import\s*{\s*B\s*}\s*from\s*"b";/.test(dist));
  });

  it('should generate a typescript declaration file even when composite and incremental are true', async function () {
    await bundle(
      path.join(__dirname, '/integration/ts-types/composite/index.ts'),
    );

    let dist = (
      await outputFS.readFile(
        path.join(__dirname, '/integration/ts-types/composite/dist/index.d.ts'),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(__dirname, '/integration/ts-types/composite/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should work with module augmentation', async function () {
    let fixtureDir = path.join(__dirname, 'integration/ts-types/augmentation');
    await outputFS.mkdirp(path.join(fixtureDir, 'node_modules'));
    await ncp(fixtureDir, fixtureDir);
    await outputFS.symlink(
      path.join(fixtureDir, 'original'),
      path.join(fixtureDir, 'node_modules/original'),
    );

    let b = await bundle(path.join(fixtureDir, 'augmenter'), {
      inputFS: overlayFS,
    });
    assertBundles(b, [
      {
        name: 'index.js',
        type: 'js',
        assets: ['index.ts'],
      },
      {
        name: 'index.d.ts',
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(fixtureDir, 'augmenter/dist/index.d.ts'),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(fixtureDir, 'augmenter/src/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should handle re-exporting aggregating correctly', async function () {
    await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/re-exporting-aggregating/index.ts',
      ),
    );

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/re-exporting-aggregating/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/re-exporting-aggregating/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should handle a tsconfig file with paths on windows', async function () {
    await bundle(
      path.join(__dirname, '/integration/ts-types/windows-paths/index.ts'),
    );

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/windows-paths/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');

    let expected = await inputFS.readFile(
      path.join(__dirname, '/integration/ts-types/windows-paths/expected.d.ts'),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should handle naming collisions between top-level exports and wildcard exports', async function () {
    let b = await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-collision/index.ts',
      ),
    );

    assertBundles(b, [
      {
        name: 'types.d.ts',
        type: 'ts',
        assets: ['index.ts'],
      },
      {
        name: 'main.js',
        type: 'js',
        assets: ['index.ts', 'other1.ts', 'other2.ts', 'consumer.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/exporting-collision/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-collision/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with namespace exports (old)', async function () {
    let b = await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces/index.ts',
      ),
    );

    assertBundles(b, [
      {
        name: 'main.js',
        type: 'js',
        assets: [
          'index.ts',
          'internal-exporter.ts',
          'other1.ts',
          'other2.ts',
          'other3.ts',
          're-exporter.ts',
          'stuff.ts',
          'stuff2.ts',
          'stuff3.ts',
        ],
      },
      {
        name: 'types.d.ts',
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/exporting-namespaces/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should handle naming collisions between namespace names', async function () {
    let b = await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces-collision/index.ts',
      ),
    );

    assertBundles(b, [
      {
        name: 'types.d.ts',
        type: 'ts',
        assets: ['index.ts'],
      },
      {
        name: 'main.js',
        type: 'js',
        assets: [
          'index.ts',
          'exporter.ts',
          'other1.ts',
          'other2.ts',
          'consumer.ts',
        ],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/exporting-namespaces-collision/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces-collision/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with namespace exports (new)', async function () {
    let b = await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces-new/index.ts',
      ),
    );

    assertBundles(b, [
      {
        name: 'main.js',
        type: 'js',
        assets: [
          'index.ts',
          'level2-exporter.ts',
          'level2.ts',
          'level3.ts',
          'namespace-other-exporter.ts',
          'namespace-other.ts',
          'namespace.ts',
          'other.ts',
          'wildcard-exports.ts',
        ],
      },
      {
        name: 'types.d.ts',
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/exporting-namespaces-new/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces-new/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });

  it('should generate ts declarations with namespace re-exports', async function () {
    let b = await bundle(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces-reexport/index.ts',
      ),
    );

    assertBundles(b, [
      {
        name: 'main.js',
        type: 'js',
        assets: ['index.ts', 'namespace.ts', 'namespace2.ts'],
      },
      {
        name: 'types.d.ts',
        type: 'ts',
        assets: ['index.ts'],
      },
    ]);

    let dist = (
      await outputFS.readFile(
        path.join(
          __dirname,
          '/integration/ts-types/exporting-namespaces-reexport/dist/types.d.ts',
        ),
        'utf8',
      )
    ).replace(/\r\n/g, '\n');
    let expected = await inputFS.readFile(
      path.join(
        __dirname,
        '/integration/ts-types/exporting-namespaces-reexport/expected.d.ts',
      ),
      'utf8',
    );
    assert.equal(dist, expected);
  });
});
