'use strict';

const fs = require('fs');
const got = require('got');
const normalizeUrl = require('normalize-url');


exports.promisify = promisify;
exports.readJson = readJson;
exports.writeJson = writeJson;
exports.version = version;


/**
 *
 * @param file
 */
function* readJson(file) {
  let data = {};
  try {
    data = yield promisify(fs.readFile)(file, 'utf8');
    data = JSON.parse(data);
  } catch(e) {}
  return data;
}


/**
 *
 * @param file
 * @param data
 */
function* writeJson(file, data) {
  try {
    data = JSON.stringify(data, null, 2);
    yield promisify(fs.writeFile)(file, data, 'utf8');
  } catch(e) {}
}


/**
 *
 * @param registry
 * @param name
 * @param tag
 * @returns {String}
 */
function* version(registry, name, tag) {
  let ver = '';
  try {
    const url = normalizeUrl(registry + '/' + name);
    const res = yield got.get(url, {
      'json': true,
      'timeout': 60 * 1000
    });
    if (res && res.body && res.body['dist-tags'] && res.body['dist-tags'][tag]) {
      ver = res.body['dist-tags'][tag];
    }
  } catch(e) {}
  return ver;
}


/**
 *
 * @param func
 * @param ctx
 * @returns {Function}
 */
function promisify(func, ctx) {
  const slice = Array.prototype.slice;

  ctx = ctx || null;
  return function() {
    const args = slice.call(arguments);

    return new Promise(function(resolve, reject) {
      args.push(function callback() {
        const values = slice.call(arguments);
        const err = values.shift();
        if (err) {
          return reject(err);
        }
        return resolve(values);
      });

      const res = func.apply(ctx, args);
      if (res && typeof res.then === 'function' && typeof res.catch === 'function') {
        resolve(res);
      }
    });
  };
}
