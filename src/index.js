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

/* eslint-disable no-console */

// native
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';

// dependencies
import settle from 'promise-settle';
import express from 'express';
import got from 'got';
import compression from 'compression';
import cors from 'cors';
import ip from 'ip';

const readFile = promisify(fs.readFile);

const getLocalModuleMap = async ({ pathToModulemap, oneAppDevCdnAddress }) => {
  const moduleMap = JSON.parse(await readFile(pathToModulemap, 'utf8'));
  Object.keys(moduleMap.modules).forEach((moduleName) => {
    const module = moduleMap.modules[moduleName];
    module.browser.url = module.browser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.legacyBrowser.url = module.legacyBrowser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.node.url = module.node.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
  });
  return JSON.stringify(moduleMap, null, 2);
};

export default ({
  localDevPublicPath,
  remoteModuleMapUrl,
  useLocalModules,
  appPort,
}) => {
  if (!remoteModuleMapUrl && !useLocalModules) {
    throw new Error('remoteModuleMapUrl is a required param when useLocalModules is not true');
  }
  if (!localDevPublicPath) { throw new Error('localDevPublicPath is a required param'); }
  if (!appPort) { throw new Error('appPort is a required param'); }

  if (remoteModuleMapUrl) {
    console.log(`one-app-dev-cdn loading module map from ${remoteModuleMapUrl}`);
  } else {
    console.log('one-app-dev-cdn only using locally served modules');
  }

  const oneAppDevCdn = express();

  if (process.env.NODE_ENV === 'production') {
    console.warn('do not include one-app-dev-cdn in production');
    return oneAppDevCdn;
  }

  oneAppDevCdn.disable('x-powered-by');

  oneAppDevCdn.use(compression());

  oneAppDevCdn.use(cors({
    origin: [
      `http://localhost:${appPort}`,
      `http://${ip.address()}:${appPort}`,
      undefined,
    ],
  }));

  // support one-app-cli's "serve-module"
  // merge local with remote, with local taking preference
  oneAppDevCdn.get('/module-map.json', (req, response) => {
    settle([
      remoteModuleMapUrl
        ? got(remoteModuleMapUrl).then(
          r => JSON.parse(r.body),
          (error) => {
            console.warn(
              `one-app-dev-cdn error loading module map from ${remoteModuleMapUrl}: ${error}`
            );
            return {};
          }
        )
        : {},
      (useLocalModules ? getLocalModuleMap({
        pathToModulemap: path.join(localDevPublicPath, 'module-map.json'),
        oneAppDevCdnAddress: `http://${req.headers.host}`,
      })
        .then(JSON.parse) : {}),
    ])
      .then(([remoteMap, localMap]) => {
        const map = {
          ...remoteMap.value(),
          key: 'not-used-in-development',
          modules: {
            ...remoteMap.value().modules,
            ...localMap.isFulfilled() && {
              ...localMap.value().modules,
            },
          },
        };

        response
          .status(200)
          .send(map);
      });
  });

  // for locally served modules
  oneAppDevCdn.use('/modules', express.static(`${localDevPublicPath}/modules`));

  return oneAppDevCdn;
};
