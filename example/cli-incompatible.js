'use strict';

require('./../lib/')({
  'pkg': {
    'name': 'npm',
    'version': '3.10.0'
  }
}).then(() => {
  console.log('ok');
}).catch((e) => {
  console.log('error', e);
});