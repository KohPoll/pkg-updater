'use strict';

require('./../lib/')({
  'pkg': {
    'name': 'npm',
    'version': '2.10.0'
  }
}).then(() => {
  console.log('ok');
}).catch((e) => {
  console.log('error', e);
});