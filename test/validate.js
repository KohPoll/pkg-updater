'use strict';

const test = require('tape');

const updater = require('../lib/');

test('opts valid', function(t) {

  t.throws(
    function() { updater({'registry': ''}); },
    Error
  );

  t.throws(
    function() { updater({'logFile': ''}); },
    Error
  );

  t.throws(
    function() { updater({'pkg': null}); },
    Error
  );

  t.throws(
    function() { updater({'pkg': {}}); },
    Error
  );

  t.throws(
    function() { updater({'checkInterval': null}); },
    Error
  );

  t.throws(
    function() { updater({'onVersionChange': null}); },
    Error
  );

  t.end();
});