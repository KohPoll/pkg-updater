'use strict';


module.exports = updater;


/**
 *
 * @param opts
 *   - registry
 *   - pkg(required)
 *   - tag
 *   - level
 *   - logFile
 *   - checkInterval
 *   - updateMessage
 *   - onVersionChange
 */
function updater(opts) {
  opts = Object.assign({}, updater.defaultOpts, opts || {});

  if (!opts.registry) {
    throw new Error('opts.registry is required');
  }

  if (!opts.logFile) {
    throw new Error('opts.logFile is required');
  }

  if (!opts.pkg) {
    throw new Error('opts.pkg is required');
  }
  if (!opts.pkg.name || !opts.pkg.version) {
    throw new Error('opts.pkg is invalid');
  }

  opts.checkInterval = Number(opts.checkInterval);
  if (!opts.checkInterval || isNaN(opts.checkInterval)) {
    throw new Error('opts.checkInterval is invalid');
  }

  opts.onVersionChange = opts.onVersionChange || updater.onVersionChange;
  if (typeof opts.onVersionChange != 'function') {
    throw new Error('opts.onVersionChange is invalid');
  }

  const co = require('co');
  return co(function* () {
    const checkInfo = yield updater.readCheckInfo(opts);
    const lastCheck = checkInfo.lastCheck;
    const lastVersion = checkInfo.lastVersion;

    // diff the type.
    const type = updater.diffType(opts.pkg.version, lastVersion, opts.level);
    if (type) {
      yield co.call(null, opts.onVersionChange, {
        'incompatible': type == 'incompatible',
        'lastVersion': lastVersion,
        'pkg': opts.pkg,
        'level': opts.level,
        'updateMessage': opts.updateMessage
      });
    }

    if (Date.now() - lastCheck < opts.checkInterval) {
      return;
    }
    updater.spawnCheck(opts);
  });
}

//
updater.defaultOpts = {
  'registry': 'https://registry.npmjs.org',
  'pkg': null,
  'tag': 'latest',
  'level': 'major',
  'logFile': require('path').join(require('userhome')(), '.pkg_updater.json'),
  'checkInterval': 60 * 60 * 1000,
  'updateMessage': 'Package update available: ' +
    '<%=colors.dim(current)%> -> <%=colors.green(latest)%>' +
    '<%if(incompatible){%>\n<%=colors.bold("This version is incompatible, you should update before continuing.")%><%}%>\n' +
    'Run <%=colors.cyan(command)%> to update.',
  'onVersionChange': null // fn(opts) opts:{incompatible,lastVersion,pkg,level,updateMessage}
};

//
updater.colors = require('colors/safe');
updater.template = require('lodash.template');
updater.boxen = require('boxen');

/**
 *
 * @param opts
 * @returns {Object}
 */
updater.readCheckInfo = function* (opts) {
  let lastCheck = 0;
  let lastVersion = opts.pkg.version;

  const data = yield require('./util').readJson(opts.logFile);
  if (data[opts.pkg.name]) {
    lastCheck = Number(data[opts.pkg.name].lastCheck);
    if (isNaN(lastCheck)) {
      lastCheck = 0;
    }

    lastVersion = String(data[opts.pkg.name].lastVersion);
  }

  return {
    'lastCheck': lastCheck,
    'lastVersion': lastVersion
  };
};


/**
 *
 * @param current
 * @param remote
 * @param level
 * @returns {string}
 */
updater.diffType = function(current, remote, level) {
  const semver = require('semver');
  const levels = ['patch', 'minor', 'major'];

  let type = '';
  if (semver.valid(remote)) {
    const diff = semver.diff(remote, current);
    // diff is not null means the version is not equal.
    if (diff && semver.gt(remote, current)) {
      type = 'compatible';

      let a = levels.indexOf(level);
      if (a != -1) {
        let b = -1;
        for (let i = 0, len = levels.length; i < len; i += 1) {
          if (diff == levels[i] || diff == ('pre' + levels[i])) {
            b = i;
          }
        }

        if (b - a >= 0) {
          type = 'incompatible';
        }
      }
    }
  }
  return type;
};


/**
 *
 * @param opts
 */
updater.spawnCheck = function(opts) {
  try {
    require('child_process').spawn(
      process.execPath,
      [require('path').join(__dirname, '_check.js'), JSON.stringify({
        'pkg': opts.pkg,
        'tag': opts.tag,
        'logFile': opts.logFile,
        'registry': opts.registry
      })],
      {'stdio': ['ignore', 'ignore', 'ignore'], 'detached': true}
    ).unref();
  } catch(e) {}
};


/**
 *
 * @param opts
 */
updater.onVersionChange = function* (opts) {
  console.log(
    updater.boxen(updater.render(opts), {
      'padding': 1,
      'margin': 1,
      'borderColor': opts.incompatible ? 'red' : 'yellow',
      'borderStyle': 'classic'
    })
  );
  if (opts.incompatible) {
    process.exit(1);
  }
};


/**
 *
 * @param opts
 */
updater.render = function(opts) {
  return updater.template(opts.updateMessage || updater.defaultOpts.updateMessage)({
    'colors': updater.colors,
    'incompatible': opts.incompatible,
    'name': opts.pkg.name,
    'current': opts.pkg.version,
    'latest': opts.lastVersion,
    'command': 'npm i -g ' + opts.pkg.name
  });
};