'use strict';

const co = require('co');
const util = require('./util');

const opts = JSON.parse(process.argv[2]);
console.log('opts', opts);

co(function* () {
  let lastVersion = yield util.version(opts.registry, opts.pkg.name, opts.tag);
  if (!lastVersion) {
    lastVersion = opts.pkg.version;
  }

  let data = yield util.readJson(opts.logFile);
  if (!data[opts.pkg.name]) {
    data[opts.pkg.name] = {};
  }
  data[opts.pkg.name].lastVersion = lastVersion;
  data[opts.pkg.name].lastCheck = Date.now();

  yield util.writeJson(opts.logFile, data);
})
.then(() => {
  console.log('success');
  process.exit(0);
})
.catch((e) => {
  console.log('error', e.stack);
  process.exit(1);
});