'use strict';


module.exports = updater;


/**
 *
 * @param opts
 *   - registry
 *   - pkg
 *   - tag
 *   - logFile
 *   - level
 *   - checkInterval
 *   - updateMessage
 *   - onVersionChange
 */
function updater(opts) {
  opts = opts || {};

  opts.registry = opts.registry || 'https://registry.npmjs.org';
  opts.pkg = opts.pkg || null;
  opts.tag = opts.tag || 'latest';
  opts.logFile = opts.logFile || updater.defaultLogFile();
  opts.level = opts.level || 'major';
  opts.checkInterval = Number(opts.checkInterval || 60 * 60 * 1000); // 1h
  opts.updateMessage = opts.updateMessage || '';
  opts.onVersionChange = opts.onVersionChange || updater.onVersionChange;

  if (!opts.updateMessage) {
    opts.updateMessage = 'Package update available: ' +
      '<%=colors.dim(current)%> -> <%=colors.green(latest)%>' +
      '<%if(incompatible){%>\n<%=colors.bold("This version is incompatible, you should update before continuing.")%><%}%>\n' +
      'Run <%=colors.cyan(command)%> to update.';
  }

  if (!opts.pkg) {
    throw new Error('opts.pkg is required');
  }
  if (!opts.checkInterval || isNaN(opts.checkInterval)) {
    throw new Error('opts.checkInterval is invalid');
  }
  if (!opts.logFile) {
    throw new Error('opts.logFile is required');
  }

  return require('co')(function* () {
    const checkInfo = yield updater.readCheckInfo(opts);
    const lastCheck = checkInfo.lastCheck;
    const lastVersion = checkInfo.lastVersion;

    const type = updater.diffType(opts.pkg.version, lastVersion, opts.level);
    if (type) {
      yield opts.onVersionChange({
        'incompatible': type == 'incompatible',
        'lastVersion': lastVersion,
        'pkg': opts.pkg,
        'level': opts.level,
        'updateMessage': opts.updateMessage,

        'colors': require('colors/safe'),
        'template': require('lodash.template'),
        'boxen': require('boxen')
      });
    }

    // not the time to check.
    if (Date.now() - lastCheck < opts.checkInterval) {
      return;
    }

    // spawn the _check.js to run.
    updater.spawnCheck(opts);
  });
}


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

  let type = '';
  if (semver.valid(remote)) {
    const diff = semver.diff(remote, current);
    // diff is not null means the version is not equal.
    if (diff) {
      if (semver.gt(remote, current)) {
        type = 'compatible';
        if (diff == level || diff == ('pre' + level)) {
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
 * @returns {String}
 */
updater.defaultLogFile = function() {
  const os = require('os');

  let file = '';
  if (typeof os.homedir == 'function') {
    file = os.homedir();
  } else {
    file = homedir();
  }

  return require('path').join(file, '.pkg_updater.json');

  function homedir() {
    var env = process.env;
    var home = env.HOME;
    var user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

    if (process.platform === 'win32') {
      return env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH || home || null;
    }

    if (process.platform === 'darwin') {
      return home || (user ? '/Users/' + user : null);
    }

    if (process.platform === 'linux') {
      return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
    }

    return home || null;
  }
};


/**
 *
 * @param opts
 *   - incompatible
 *   - lastVersion
 *   - pkg
 *   - level
 *   - updateMessage
 *
 *   - colors
 *   - template
 *   - boxen
 */
updater.onVersionChange = function* (opts) {
  console.error(updater.render(opts));
  if (opts.incompatible) {
    process.exit(1);
  }
};


/**
 *
 * @param opts
 */
updater.render = function(opts) {
  const notice = opts.template(opts.updateMessage)({
    'colors': opts.colors,
    'incompatible': opts.incompatible,
    'name': opts.pkg.name,
    'current': opts.pkg.version,
    'latest': opts.lastVersion,
    'command': 'npm i -g ' + opts.pkg.name
  });

  return opts.boxen(notice, {
    'padding': 1,
    'margin': 1,
    'borderColor': opts.incompatible ? 'red' : 'yellow',
    'borderStyle': 'classic'
  });
};