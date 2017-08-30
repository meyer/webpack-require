'use strict';

const webpackRequire = require('../lib/webpackRequire');

describe('webpackRequire', function() {
  it('works', function(done) {
    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/component'),
      (err, mod) => {
        const text = mod();
        expect(text.indexOf('base64')).toBeGreaterThan(-1);
        expect(text.indexOf('webpack')).toBeGreaterThan(-1);
        done();
      }
    );
  });

  it('supports caching', function(done) {
    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/component'),
      function(err, originalMod) {
        const serialized = JSON.stringify(originalMod.serialize());
        const mod = webpackRequire.requireSerialized(JSON.parse(serialized));
        const text = mod();
        expect(text.indexOf('base64')).toBeGreaterThan(-1);
        expect(text.indexOf('webpack')).toBeGreaterThan(-1);
        done();
      }
    );
  });

  // it does not have sick stack traces
  it.skip('has sick stack traces', function(done) {
    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/throwError'),
      function(err, mod) {
        expect(err).toBe(null);
        const e = null;
        try {
          mod();
        } catch (_e) {
          e = _e;
        }

        expect(
          e.stack.indexOf('webpack-require/spec/app/throwError.js:1:1)')
        ).toBeGreaterThan(-1);
        done();
      }
    );
  });

  it('shims', function(done) {
    const stateful = require('./app/stateful');
    stateful.value = 'node';

    webpackRequire(
      require('./app/webpack.config.js'),
      require.resolve('./app/component'),
      [require.resolve('./app/stateful')],
      function(err, mod) {
        const text = mod();
        expect(text.indexOf('base64')).toBeGreaterThan(-1);
        expect(text.indexOf('node')).toBeGreaterThan(-1);
        done();
      }
    );
  });
});
