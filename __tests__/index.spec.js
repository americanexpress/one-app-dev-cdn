/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,either express
 * or implied. See the License for the specific language governing permissions and limitations
 * under the License.
 */

/* eslint-disable jest/no-disabled-tests, no-console */
import supertest from 'supertest';
import got from 'got';
import rimraf from 'rimraf';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import oneAppDevCdn from '../src';

const pathToStubs = path.join(__dirname, 'stubs');
const pathToCache = path.join(__dirname, '..', '.cache');
const mockLocalDevPublicPath = path.join(pathToStubs, 'public');

jest.mock('got');

const origNodeEnv = process.env.NODE_ENV;

describe('one-app-dev-cdn', () => {
  jest.spyOn(console, 'warn');
  jest.spyOn(console, 'log');
  const defaultLocalMap = {
    key: 'not-used-in-development',
    modules: {
      'module-a': {
        node: {
          url: 'https://example.com/cdn/module-a/1.0.0/module-a.node.js',
          integrity: '123',
        },
        browser: {
          url: 'https://example.com/cdn/module-a/1.0.0/module-a.browser.js',
          integrity: '234',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/module-a/1.0.0/module-a.legacy.browser.js',
          integrity: '345',
        },
      },
    },
  };
  const defaultRemoteMap = {
    key: '234234',
    modules: {
      'module-b': {
        node: {
          url: 'https://example.com/cdn/module-b/1.0.0/module-b.node.js',
          integrity: '123',
        },
        browser: {
          url: 'https://example.com/cdn/module-b/1.0.0/module-b.browser.js',
          integrity: '234',
        },
        legacyBrowser: {
          url: 'https://example.com/cdn/module-b/1.0.0/module-b.legacy.browser.js',
          integrity: '345',
        },
      },
    },
  };

  const defaultPublicDirContentsSetting = {
    moduleMapContent: JSON.stringify(defaultLocalMap),
    modules: [
      { moduleName: 'module-a', moduleVersion: '1.0.0', bundleContent: 'console.log("a");' },
    ],
    allowCacheWrite: true,
  };

  const createPublicDir = (publicDirContents) => {
    const {
      moduleMapContent, modules, noContent, allowCacheWrite,
    } = publicDirContents;

    if (noContent) {
      return;
    }

    if (!allowCacheWrite) {
      mkdirp(pathToCache, { mode: 444 });
    }
    const modulesDir = path.join(mockLocalDevPublicPath, 'modules');
    mkdirp.sync(modulesDir);
    fs.writeFileSync(path.join(`${mockLocalDevPublicPath}/module-map.json`), moduleMapContent);
    modules.forEach((module) => {
      const { moduleName, moduleVersion, bundleContent } = module;
      const pathToModuleBundle = path.join(modulesDir, moduleName, moduleVersion);
      mkdirp.sync(pathToModuleBundle);
      fs.writeFileSync(path.join(pathToModuleBundle, `${moduleName}.browser.js`), bundleContent);
    });
  };

  const setupTest = ({
    nodeEnv = 'development',
    publicDirContentsSetting = defaultPublicDirContentsSetting,
    useLocalModules,
    remoteModuleMapUrl,
    appPort,
  } = {}) => {
    process.env.NODE_ENV = nodeEnv;
    console.log('remoteModuleMapUrl', remoteModuleMapUrl);
    createPublicDir(publicDirContentsSetting);
    return oneAppDevCdn({
      localDevPublicPath: mockLocalDevPublicPath,
      remoteModuleMapUrl,
      useLocalModules,
      appPort,
    });
  };

  beforeEach(() => {
    jest
      .resetAllMocks()
      .resetModules();

    got.mockImplementation(url => Promise.reject(new Error(`no mock for ${url} set up`)));
  });

  it('add CORS headers based on appPort configuration value', () => {
    expect.assertions(4);
    const appPort = 5000;
    const fcdn = setupTest({ appPort, useLocalModules: true });

    return supertest(fcdn)
      .get('/module-map.json')
      .set('Origin', `http://localhost:${appPort}`)
      .then((response) => {
        expect(response.headers['access-control-allow-origin']).toBe(`http://localhost:${appPort}`);
        expect(response.headers.vary).toEqual(expect.any(String));
        const varyHeaders = response.headers.vary.split(',').map(s => s.trim());
        expect(varyHeaders).toContain('Origin');
        expect(varyHeaders).toContain('Accept-Encoding');
      });
  });

  describe('usage', () => {
    it('should throw if localDevPublicPath is not given', () => {
      expect(() => oneAppDevCdn({
        remoteModuleMapUrl: 'https://my-domain.com/map/module-map.json',
        appPort: 3000,
      })).toThrowErrorMatchingSnapshot();
    });

    it('should throw if neither remoteModuleMapUrl nor useLocalModules is given', () => {
      expect(() => oneAppDevCdn({
        localDevPublicPath: mockLocalDevPublicPath,
        appPort: 3000,
      })).toThrowErrorMatchingSnapshot();
    });

    it('should throw if appPort is not given', () => {
      expect(
        () => oneAppDevCdn({
          localDevPublicPath: mockLocalDevPublicPath,
          remoteModuleMapUrl: 'https://my-domain.com/map/module-map.json',
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });

  describe('module-map.json', () => {
    it('uses the local map overriding the cdn url placeholder with the one-app-dev-cdn url', () => {
      expect.assertions(3);
      const localMap = {
        key: 'not-used-in-development',
        modules: {
          'module-a': {
            node: {
              url: '[one-app-dev-cdn-url]/module-a/1.0.0/module-a.node.js',
              integrity: '123',
            },
            browser: {
              url: '[one-app-dev-cdn-url]/module-a/1.0.0/module-a.browser.js',
              integrity: '234',
            },
            legacyBrowser: {
              url: '[one-app-dev-cdn-url]/module-a/1.0.0/module-a.legacy.browser.js',
              integrity: '345',
            },
          },
        },
      };
      const fcdn = setupTest({
        useLocalModules: true,
        appPort: 3000,
        publicDirContentsSetting: {
          moduleMapContent: JSON.stringify(localMap),
          modules: [
            {
              moduleName: 'module-a',
              moduleVersion: '1.0.0',
              bundleContent: 'console.log("a");',
            },
          ],
        },
      });

      return supertest(fcdn)
        .get('/module-map.json')
        .set('Host', 'localhost:3001')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          const responseBody = JSON.parse(response.text);
          expect(responseBody).toMatchSnapshot(
            {
              modules: {
                'module-a': {
                  node: {
                    url: 'http://localhost:3001/module-a/1.0.0/module-a.node.js',
                  },
                  browser: {
                    url: 'http://localhost:3001/module-a/1.0.0/module-a.browser.js',
                  },
                  legacyBrowser: {
                    url: 'http://localhost:3001/module-a/1.0.0/module-a.legacy.browser.js',
                  },
                },
              },
            }
          );
        });
    });

    // it('overrides the existing')

    it('does not use the local map when useLocalModules is false', () => {
      expect.assertions(4);

      const fcdn = setupTest({
        useLocalModules: false,
        remoteModuleMapUrl: 'https://example.com/cdn/module-map.json',
        appPort: 3000,
      });
      got.mockReturnJsonOnce(defaultRemoteMap);

      return supertest(fcdn)
        .get('/module-map.json')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          const responseBody = response.text;
          expect(responseBody).toBe(
            JSON.stringify({ ...defaultRemoteMap, key: 'not-used-in-development' })
          );
          expect(responseBody.modules).not.toEqual(defaultLocalMap.modules);
        });
    });

    it('mirrors the remote map but modifies the key property', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({ appPort: 3000, useLocalModules: false, remoteModuleMapUrl });
      got.mockReturnJsonOnce(defaultRemoteMap);

      return supertest(fcdn)
        .get('/module-map.json')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          expect(response.text).toEqual(JSON.stringify({ ...defaultRemoteMap, key: 'not-used-in-development' }));
          expect(got.mock.calls).toEqual([[remoteModuleMapUrl]]);
        });
    });

    it('extends the remote map with the local map', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';

      const fcdn = setupTest({ remoteModuleMapUrl, useLocalModules: true, appPort: 3000 });
      got.mockReturnJsonOnce(defaultRemoteMap);

      return supertest(fcdn)
        .get('/module-map.json')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          expect(response.text).toMatchSnapshot();
          expect(got.mock.calls).toEqual([[remoteModuleMapUrl]]);
        });
    });

    it('does not extend the remote map with the local map when useLocalModules is false', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({ useLocalModules: false, remoteModuleMapUrl, appPort: 3000 });
      got.mockReturnJsonOnce(defaultRemoteMap);

      return supertest(fcdn)
        .get('/module-map.json')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          const responseBody = response.text;
          expect(responseBody).toEqual(
            JSON.stringify({ ...defaultRemoteMap, key: 'not-used-in-development' })
          );
          expect(got.mock.calls).toEqual([[remoteModuleMapUrl]]);
        });
    });

    it('always lets the local map win', () => {
      expect.assertions(4);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';

      const fcdn = setupTest({ remoteModuleMapUrl, useLocalModules: true, appPort: 3000 });
      const remoteMap = {
        key: '1233',
        modules: {
          'module-a': {
            node: {
              url: 'https://example.com/cdn/module-b/2.0.0/module-b.node.js',
              integrity: '123',
            },
            browser: {
              url: 'https://example.com/cdn/module-b/2.0.0/module-b.browser.js',
              integrity: '234',
            },
            legacyBrowser: {
              url: 'https://example.com/cdn/module-b/2.0.0/module-b.legacy.browser.js',
              integrity: '345',
            },
          },
        },
      };
      got.mockReturnJsonOnce(remoteMap);

      return supertest(fcdn)
        .get('/module-map.json')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          expect(response.text).toEqual(JSON.stringify(defaultLocalMap));
          expect(got.mock.calls).toEqual([[remoteModuleMapUrl]]);
        });
    });

    it('warns and ignores error loading remote module-map', () => {
      expect.assertions(6);
      const remoteModuleMapUrl = 'https://my-domain.com/map/module-map.json';
      const fcdn = setupTest({ remoteModuleMapUrl, useLocalModules: true, appPort: 3000 });
      got.mockReturnJsonOnce(new Error('simulated timeout or some other network error!'));

      return supertest(fcdn)
        .get('/module-map.json')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          expect(response.text).toEqual(JSON.stringify(defaultLocalMap));
          expect(got.mock.calls).toEqual([[remoteModuleMapUrl]]);
          expect(console.warn).toHaveBeenCalledTimes(1);
          expect(console.warn).toHaveBeenCalledWith(
            'one-app-dev-cdn error loading module map from https://my-domain.com/map/module-map.json: Error: simulated timeout or some other network error!'
          );
        });
    });

    it('does not attempt to fetch remote module map when remoteModuleMapUrl is not given', () => {
      expect.assertions(4);

      const fcdn = setupTest({
        appPort: 3000,
        useLocalModules: true,
      });
      got.mockReturnJsonOnce({ 'module-a': '1.2.0' });

      return supertest(fcdn)
        .get('/module-map.json')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/json/);
          expect(response.text).toEqual(JSON.stringify(defaultLocalMap));
          expect(got.mock.calls).toEqual([]);
        });
    });
  });

  describe('modules', () => {
    it('gets local modules', () => {
      expect.assertions(3);

      const fcdn = setupTest({ useLocalModules: true, appPort: 3000 });

      return supertest(fcdn)
        .get('/modules/module-a/1.0.0/module-a.browser.js?key="123')
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.header['content-type']).toMatch(/^application\/javascript/);
          expect(response.text).toBe('console.log("a");');
        });
    });
  });

  describe('production', () => {
    it('warns when used in production', () => {
      process.env.NODE_ENV = 'production';
      console.warn.mockClear();
      oneAppDevCdn({
        localDevPublicPath: mockLocalDevPublicPath,
        remoteModuleMapUrl: 'https://my-cdn-domain.com/map/module-map.json',
        appPort: 3000,
      });

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith('do not include one-app-dev-cdn in production');
    });
  });

  afterEach(() => {
    rimraf.sync(pathToCache);
    rimraf.sync(pathToStubs);
  });

  afterAll(() => {
    process.env.NODE_ENV = origNodeEnv;
  });
});
