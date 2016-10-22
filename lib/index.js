'use strict';

const path = require('path');
const semver = require('semver');
const co = require('co');
const util = require('./util');


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
  opts.logFile = opts.logFile || defaultLogFile();
  opts.level = opts.level || 'major';
  opts.checkInterval = Number(opts.checkInterval || 60 * 60 * 1000); // 1h
  opts.updateMessage = opts.updateMessage || '';
  opts.onVersionChange = opts.onVersionChange || onVersionChange;

  if (!opts.updateMessage) {
    opts.updateMessage = 'Package update available: ' +
      '<%=colors.dim(current)%> -> <%=colors.green(latest)%>' +
      '<%if(incompatible){%>\n<%=colors.bold("This version is incompatible, you should update before continuing.")%><%}%>\n' +
      'Run <%=colors.cyan(command)%> to update.';
  }

  if (!opts.pkg) {
    throw new Error('opts.pkg is required');
  }
  if (!opts.checkInterval) {
    throw new Error('opts.checkInterval is invalid');
  }
  if (!opts.logFile) {
    throw new Error('opts.logFile is required');
  }

  return co(function* () {
    let lastCheck = 0;
    let lastVersion = opts.pkg.version;

    const data = yield util.readJson(opts.logFile);
    if (data[opts.pkg.name]) {
      lastCheck = data[opts.pkg.name].lastCheck;
      lastVersion = data[opts.pkg.name].lastVersion;
    }

    // there is lastVersion, we should cal and notify.
    if (semver.valid(lastVersion)) {
      const diff = semver.diff(lastVersion, opts.pkg.version);
      // diff is not null means the version is not equal.
      if (diff) {
        // the last version is gt the current version.
        if (semver.gt(lastVersion, opts.pkg.version)) {
          let type = 'compatible';
          if (diff == opts.level || diff == ('pre' + opts.level)) {
            type = 'incompatible';
          }
          yield opts.onVersionChange({
            'template': require('lodash.template'),
            'type': type,
            'lastVersion': lastVersion,
            'pkg': opts.pkg,
            'level': opts.level,
            'updateMessage': opts.updateMessage
          });
        }
      }
    }

    // not the time to check.
    if (Date.now() - lastCheck < opts.checkInterval) {
      return;
    }

    // daemon the check to run.
    try {
      require('child_process').spawn(
        process.execPath,
        [path.join(__dirname, '_check.js'), JSON.stringify({
          'pkg': opts.pkg,
          'tag': opts.tag,
          'logFile': opts.logFile,
          'registry': opts.registry
        })],
        {'stdio': ['ignore', 'ignore', 'ignore'], 'detached': true}
      ).unref();
    } catch(e) {}
  });
}


/**
 *
 * @returns {String}
 */
function defaultLogFile() {
  const os = require('os');

  let file = '';
  if (typeof os.homedir == 'function') {
    file = os.homedir();
  } else {
    file = homedir();
  }

  return path.join(file, '.pkg_updater.json');

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
}


/**
 *
 * @param opts
 *   - type
 *   - lastVersion
 *   - pkg
 *   - level
 *   - updateMessage
 */
function* onVersionChange(opts) {
  const notice = opts.template(opts.updateMessage)({
    'colors': require('colors/safe'),
    'incompatible': opts.type == 'incompatible',
    'name': opts.pkg.name,
    'current': opts.pkg.version,
    'latest': opts.lastVersion,
    'command': 'npm i -g ' + opts.pkg.name
  });

  console.log(require('boxen')(notice, {
    'padding': 1,
    'margin': 1,
    'borderColor': opts.type == 'incompatible' ? 'red' : 'yellow',
    'borderStyle': 'classic'
  }));
  if (opts.type == 'incompatible') {
    process.exit(1);
  }
}