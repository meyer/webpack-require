'use strict';

const MemoryFilesystem = require('memory-fs');

const invariant = require('invariant');
const path = require('path');
const sourceMapSupport = require('./sourceMapSupport');
const vm = require('vm');
const webpack = require('webpack');

function buildFactory(source, globals) {
  const script = new vm.Script(source, { filename: '/bundle.js' });
  const factory = function() {
    const context = vm.createContext(globals);
    const sandboxedError = vm.runInContext('Error', context);
    sourceMapSupport(sandboxedError, function() {
      return source;
    });
    script.runInContext(context);
    return context.entrypoint;
  };

  factory.serialize = function() {
    return source;
  };

  return factory;
}

function compile(config, name, sharedModulesMap, globals, cb) {
  const originalExternals = config.externals || {};
  function externals(context, request, cb) {
    if (originalExternals.hasOwnProperty(request)) {
      cb(null, config.externals[request]);
    } else if (request[0] !== '.') {
      cb(null, sharedModulesMap[request]);
    } else {
      cb(
        null,
        sharedModulesMap[path.normalize(path.join(context, request) + '.js')]
      );
    }
  }

  invariant(
    path.isAbsolute(name),
    'Module name must be an absolute path. Did you forget to require.resolve()?'
  );

  config = Object.assign({}, config);
  config.externals = externals;
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias.ENTRYPOINT = name;
  config.entry = require.resolve('./webpackRequireEntrypoint');
  config.devtool = 'inline-source-map';
  config.output = Object.assign({}, config.output, {
    filename: 'bundle.js',
    path: '/',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  });

  const compiler = webpack(config);
  const fs = new MemoryFilesystem();
  compiler.outputFileSystem = fs;

  compiler.run(function(err, stats) {
    if (err) {
      cb(err, null, stats);
      return;
    }

    const statsJson = stats.toJson();

    if (statsJson.errors.length > 0) {
      cb(statsJson.errors, null, stats);
    }

    const data = fs.readFileSync('/bundle.js', 'utf8');

    cb(null, data, stats, fs);
  });
}

function buildGlobalsAndSharedModulesMap(sharedModules, globals) {
  const rv = {
    sharedModulesMap: {},
    globals: Object.assign({}, globals),
  };

  sharedModules.forEach(function(path, i) {
    invariant(path[0] !== '.', 'You cannot share relative paths');
    const globalVariableName = '__webpackRequireModule_' + i;
    rv.sharedModulesMap[path] = globalVariableName;
    rv.globals[globalVariableName] = require(path);
  });

  return rv;
}

function webpackRequire(config, name, sharedModules, globals, cb) {
  if (!globals && !cb) {
    cb = sharedModules;
    sharedModules = [];
    globals = { console };
  } else if (!cb) {
    cb = globals;
    globals = { console };
  }

  const globalsAndSharedModulesMap = buildGlobalsAndSharedModulesMap(
    sharedModules,
    globals
  );

  compile(
    config,
    name,
    globalsAndSharedModulesMap.sharedModulesMap,
    globalsAndSharedModulesMap.globals,
    function(err, data, stats, fs) {
      if (err) {
        cb(err, null, stats, fs);
        return;
      }
      cb(
        null,
        buildFactory(data, globalsAndSharedModulesMap.globals),
        stats,
        fs
      );
    }
  );
}

function requireSerialized(source, sharedModules, globals) {
  if (!globals) {
    globals = { console };
  }

  if (!sharedModules) {
    sharedModules = [];
  }

  const globalsAndSharedModulesMap = buildGlobalsAndSharedModulesMap(
    sharedModules,
    globals
  );

  return buildFactory(source, globalsAndSharedModulesMap.globals);
}

webpackRequire.requireSerialized = requireSerialized;
module.exports = webpackRequire;
