'use strict';

require('./../lib/')({
  'pkg': {
    'name': 'npm',
    'version': '5.0.0'
  }
}).then(() => {
  console.log('ok');
}).catch((e) => {
  console.log('error', e);
});