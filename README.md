# pkg-updater
This package is suitable for update checking of cli tools. It will check the version in background process, and notify the users when update is available.

## Usage
Install the module with: `npm install pkg-updater --save`.

```javascript
const updater = require('pkg-updater');
const pkg = require('./package.json'); // your cli tool's package.json

updater({'pkg': pkg}) .then(() => { /* start cli here */ });

updater({
  'pkg': pkg,  
  'registry': 'http://xxx.registry.com', // custom registry
  'tag': 'next', // custom the check tag(default is latest)
  'checkInterval': 24 * 60 * 60 * 1000, // custom the check interval(ms)
  'updateMessage': 'package update from <%=current%> to <%=latest%>.' // custom notify message
}).then(() => { /* start cli here */ });
```

## API
### updater(options) -> {Promise}
* `options` {Object}
  * `pkg` {Object} (required)
  * `registry` {String}
  * `tag` {String}
  * `level` {String}
  * `checkInterval` {Integer}
  * `updateMessage` {String}
  * `onVersionChange` {Function}
  * `logFile` {String}

#### pkg
The package.json data, should contain `name` and `version` property. You can just write `require('./package.json')`.

#### registry
The registry from which we fetch the package information. It is `https://registry.npmjs.org` by default.

#### tag
The tag we use to fetch the package's version. We will request the `{registry}/{package.name}/{tag}` to get the remote version. It is `latest` by default.

#### level
The incompatible level to decide whether we should `process.exit`. It is `major` by default.

You can provide:
  - `major`: remote is `2.0.0`, current is `1.0.0`, we will `process.exit`
  - `minor`: remote is `1.1.0`, current is `1.0.0`, we will `process.exit`
  - `patch`: remote is `1.0.1`, current is `1.0.0`, we will `process.exit`

#### checkInterval
The interval(ms) to create the daemon check process. It is `60 * 60 * 1000`(1h) by default.

#### updateMessage
The message we use to notiy user in the terminal. It is a lodash template string. The default value is: 

```bash
'Package update available:' +
'<%=colors.dim(current)%> -> <%=colors.green(latest)%>' +
'<%if(incompatible){%>\n<%=colors.bold("This version is incompatible, you should update before continuing.")%><%}%>\n' +
'Run <%=colors.cyan(command)%> to update.'
```

You can use following variables:
  - `name`: package's name
  - `current`: package's current version
  - `latest`: package's remote version
  - `incompatible`: whether the `current` and `latest` is compatiable
  - `command`: the update command, default is `npm i {package.name} -g`
  - `colors`: the [colors](https://www.npmjs.com/package/colors) object

#### onVersionChange
The function to execute when the remote version is newer than the current version. 

The default behavior of this function is:
  - use the boxen to display the updateMessage
  - if the version is incompatible, exit the process

*If you really know what you are doing, you can provide your custom function.* 

This function can be a generator function, is called as followed:

```javascript
yield onVersionChange({
  'incompatible': false,
  'latestVersion': '2.0.1',
  'pkg': {
    'name': 'foo',
    'version': '2.0.0'
  },
  'level': 'major',
  'updateMessage': 'the default update message'
});
```

#### logFile
The log file we use to store the check information. It is `{$HOME}/.pkg_updater.json`.

This file's format looks like this:

```json
{
  "foo": {
    "latestVersion": "2.0.1",
    "lastCheck": 1477294183263
  },
  "bar": {
    "latestVersion": "1.0.1",  
    "lastCheck": 1477294183263     
  }
}
```