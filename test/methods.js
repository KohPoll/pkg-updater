'use strict';

const fs = require('fs');
const path = require('path');

const test = require('tape-co').default;
const sinon = require('sinon');
const FixtureStdout = require('fixture-stdout');

const updater = require('../lib/');


test('.readCheckInfo()', function* (t) {

  const logFile = path.join(__dirname, 'tmp_log.json');
  const pkg = {'name': 'test', 'version': '1.0.0'};

  const now = Date.now();
  const data = {'test': {'lastCheck': now, 'lastVersion': '2.0.0'}};

  let info = yield updater.readCheckInfo({
    'logFile': logFile,
    'pkg': pkg
  });
  t.deepEqual(
    info,
    {
      'lastCheck': 0,
      'lastVersion': pkg.version
    }
  );

  fs.writeFileSync(logFile, JSON.stringify(data), 'utf8');
  info = yield updater.readCheckInfo({
    'logFile': logFile,
    'pkg': pkg
  });
  t.deepEqual(
    info,
    {
      'lastCheck': data.test.lastCheck,
      'lastVersion': data.test.lastVersion
    }
  );

  try {
    fs.unlinkSync(logFile);
  } catch(e) {}

});

test('.diffType()', function* (t) {

  // invalid version
  let type = updater.diffType('1.0.0', '', '');
  t.deepEqual(type, '');

  // eq version
  type = updater.diffType('1.0.0', '1.0.0', '');
  t.deepEqual(type, '');

  // lt version
  type = updater.diffType('1.0.0', '0.0.9', '');
  t.deepEqual(type, '');

  // gt version
  type = updater.diffType('1.0.0', '1.0.1', '');
  t.deepEqual(type, 'compatible');

  // gt version
  type = updater.diffType('1.0.0', '1.0.1', 'minor');
  t.deepEqual(type, 'compatible');

  // gt version
  type = updater.diffType('1.0.0', '1.1.0', 'minor');
  t.deepEqual(type, 'incompatible');

  // gt version
  type = updater.diffType('1.0.0', '2.1.0', 'minor');
  t.deepEqual(type, 'incompatible');

});

test('.spawnCheck()', function* (t) {

  const stub = sinon.stub(require('child_process'), 'spawn');
  const spy = sinon.spy();
  stub.returns({'unref': spy});

  const opts = {
    'pkg': {
      'name': 'test',
      'version': '1.0.0'
    },
    'tag': 'latest',
    'logFile': 'logFile',
    'registry': 'http://registry'
  };

  updater.spawnCheck(opts);

  t.deepEqual(stub.args[0][0], process.execPath);
  t.deepEqual(stub.args[0][1], [path.resolve(__dirname, '../lib/_check.js'), JSON.stringify(opts)]);
  t.deepEqual(stub.args[0][2], {'stdio': ['ignore', 'ignore', 'ignore'], 'detached': true});

  t.ok(spy.called);

});

test('.onVersionChange()', function* (t) {

  const exitStub = sinon.stub(process, 'exit');
  const stdout = new FixtureStdout({'stream': process.stdout});

  let output;

  output = '';
  stdout.capture(function(s) {
    output += s;
    return false;
  });

  yield updater.onVersionChange({
    'pkg': {
      'name': 'test',
      'version': '1.0.0'
    },
    'lastVersion': '1.0.2',
    'incompatible': false
  });

  stdout.release();

  t.deepEqual(
    output,
    [
      '',
      '   +----------------------------------------------+',
      '   |                                              |',
      '   |   Package update available: 1.0.0 -> 1.0.2   |',
      '   |   Run npm i -g test to update.               |',
      '   |                                              |',
      '   +----------------------------------------------+',
      '',
      ''
    ].join('\n')
  );
  t.notOk(exitStub.called);

  output = '';
  stdout.capture(function(s) {
    output += s;
    return false;
  });

  yield updater.onVersionChange({
    'pkg': {
      'name': 'test',
      'version': '1.0.0'
    },
    'lastVersion': '1.0.2',
    'incompatible': true
  });
  
  stdout.release();

  t.deepEqual(
    output,
    [
      '',
      '   +------------------------------------------------------------------------+',
      '   |                                                                        |',
      '   |   Package update available: 1.0.0 -> 1.0.2                             |',
      '   |   This version is incompatible, you should update before continuing.   |',
      '   |   Run npm i -g test to update.                                         |',
      '   |                                                                        |',
      '   +------------------------------------------------------------------------+',
      '',
      ''
    ].join('\n')
  );
  t.ok(exitStub.called);

});

test('.render()', function* (t) {

  let s;

  s = updater.render({
    'pkg': {
      'name': 'test',
      'version': '1.0.0'
    },
    'lastVersion': '1.0.2',
    'incompatible': false
  });
  t.deepEqual(
    s,
    [
      'Package update available: 1.0.0 -> 1.0.2',
      'Run npm i -g test to update.'
    ].join('\n')
  );

  s = updater.render({
    'pkg': {
      'name': 'test',
      'version': '1.0.0'
    },
    'lastVersion': '2.0.0',
    'incompatible': true
  });
  t.deepEqual(
    s,
    [
      'Package update available: 1.0.0 -> 2.0.0',
      'This version is incompatible, you should update before continuing.',
      'Run npm i -g test to update.'
    ].join('\n')
  );

});