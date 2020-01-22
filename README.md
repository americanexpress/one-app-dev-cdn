<h1 align="center">
  <img src='https://github.com/americanexpress/one-app-dev-cdn/raw/master/one-app-dev-cdn.png' alt="One App Dev Proxy - One Amex" width='50%'/>
</h1>

[![npm](https://img.shields.io/npm/v/@americanexpress/one-app-dev-cdn)](https://www.npmjs.com/package/@americanexpress/one-app-dev-cdn)
[![Travis (.org) branch](https://img.shields.io/travis/americanexpress/one-app-dev-cdn/master)](https://travis-ci.org/americanexpress/one-app-dev-cdn)

> Building a local module and you want to load it? This supports loading of your remote and local modules together for local development.


## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `one-app-dev-cdn`?
> Send your resume to oneamex.careers@aexp.com


## 📖 Table of Contents

* [Features](#-features)
* [Usage](#-usage)
* [API](#-api)
* [Contributing](#-contributing)

## ✨ Features

* Loads and serves local module map.
* Loads, serves, and merges remote module map with local module map.

## 🤹‍ Usage

### Installation

```bash
npm i @americanexpress/one-app-dev-cdn -D
```

Look at the different `options` you can use under the [API](#API) section.

```js
import oneAppDevCdn from '@americanexpress/one-app-dev-cdn';

const app = express();

app.use('/static', oneAppDevCdn({
  localDevPublicPath: path.join(__dirname, '../../static'),
  remoteModuleMapUrl: 'https://my-domain.com/map/module-map.json',
  useLocalModules: true,
  appPort: 3000,
}));
```

## 🎛️ API

### `oneAppDevCdn( [options] )`

Loads the local module map and remote module map for local development.

#### options

Type: `object`

provide the options below to load module map, with `localDevPublicPath`  and `appPort` being required parameters.

##### `localDevPublicPath`

Type: `string`

location on the local filesystem where `module-map.json` and `modules` (created by One App's `serve-module`) are. **REQUIRED**

##### `appPort`

Type: `number`

Port on which One App is running. Used in order to set up CORS headers. (i.e. `3000`) **REQUIRED**

##### `remoteModuleMapUrl`

Type: `string`

location where the remote module map is located (i.e. `https://my-domain.com/map/module-map.json`), if this is not provided the local module map will be loaded.

##### `useLocalModules`

Type: `boolean`

Default: `true`<br>
Whether to use modules from `localDevPublicPath`. Passed as `true` or `false`, defaults to `true`.

**Note**: Either `remoteModuleMapUrl` OR `useLocalModules` is required. If both are provided then
the remote module map will be merged with modules from `localDevPublicPath` with the local modules
taking precedence.

## 🏆 Contributing

We welcome Your interest in the American Express Open Source Community on Github.
Any Contributor to any Open Source Project managed by the American Express Open
Source Community must accept and sign an Agreement indicating agreement to the
terms below. Except for the rights granted in this Agreement to American Express
and to recipients of software distributed by American Express, You reserve all
right, title, and interest, if any, in and to Your Contributions. Please [fill
out the Agreement](https://cla-assistant.io/americanexpress/one-app-dev-cdn).

Please feel free to open pull requests and see [CONTRIBUTING.md](./CONTRIBUTING.md) for commit formatting details.

## 🗝️ License

Any contributions made under this project will be governed by the [Apache License
2.0](https://github.com/americanexpress/one-app-dev-cdn/blob/master/LICENSE.txt).

## 🗣️ Code of Conduct

This project adheres to the [American Express Community Guidelines](./CODE_OF_CONDUCT.md).
By participating, you are expected to honor these guidelines.
