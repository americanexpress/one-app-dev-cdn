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
import fs from 'fs';

// dependencies
import settle from 'promise-settle';
import express from 'express';
import got from 'got';
import compression from 'compression';
import cors from 'cors';
import ip from 'ip';
import ProxyAgent from 'proxy-agent';

const getLocalModuleMap = ({ pathToModulemap, oneAppDevCdnAddress }) => {
  const moduleMap = JSON.parse(fs.readFileSync(pathToModulemap, 'utf8').toString());
  Object.keys(moduleMap.modules).forEach((moduleName) => {
    const module = moduleMap.modules[moduleName];
    module.browser.url = module.browser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.legacyBrowser.url = module.legacyBrowser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.node.url = module.node.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
  });
  return JSON.stringify(moduleMap, null, 2);
};

// disabling bc auto-fixing this rule causes a line longer than 100 chars so the rules conflict
// eslint-disable-next-line arrow-body-style
const matchPathToKnownRemoteModuleUrl = (incomingRequestPath, remoteModuleBaseUrls) => {
  return remoteModuleBaseUrls.find((remoteModuleBaseUrl) => {
    const remoteModuleUrlOrigin = new URL(remoteModuleBaseUrl).origin;
    const remoteModulePath = remoteModuleBaseUrl.replace(remoteModuleUrlOrigin, '');

    return incomingRequestPath.startsWith(remoteModulePath);
  });
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

  let remoteModuleBaseUrls = [];
  // support one-app-cli's "serve-module"
  // merge local with remote, with local taking preference
  oneAppDevCdn.get('/module-map.json', (req, response) => {
    settle([
      remoteModuleMapUrl
        ? got(remoteModuleMapUrl, {
          agent: new ProxyAgent(),
        }).then(
          (r) => {
            // clear out remoteModuleBaseUrls as the new module map now has different urls in it
            // not clearing would result in an ever growing array
            remoteModuleBaseUrls = [];

            const remoteModuleMap = JSON.parse(r.body);

            const { modules } = remoteModuleMap;
            const oneAppDevStaticsAddress = `http://localhost:${process.env.HTTP_ONE_APP_DEV_CDN_PORT}/static`;

            Object.keys(modules).forEach((moduleName) => {
              const module = modules[moduleName];

              const parsedBundlePath = path.parse(module.node.url, '');

              // store urls for later lookup when module requests are caught by one-app-dev-cdn
              remoteModuleBaseUrls.push(
                module.node.url.replace(parsedBundlePath.base, '')
              );

              // override remote module map to point all module URLs to one-app-dev-cdn
              module.node.url = module.node.url.replace(
                new URL(module.node.url).origin, oneAppDevStaticsAddress
              );
              module.legacyBrowser.url = module.legacyBrowser.url.replace(
                new URL(module.legacyBrowser.url).origin, oneAppDevStaticsAddress
              );
              module.browser.url = module.browser.url.replace(
                new URL(module.browser.url).origin, oneAppDevStaticsAddress
              );
            });
            return remoteModuleMap;
          },
          (error) => {
            console.warn(
              `one-app-dev-cdn error loading module map from ${remoteModuleMapUrl}: ${error}`
            );
            return {};
          }
        )
        : {},
      (useLocalModules ? JSON.parse(getLocalModuleMap({
        pathToModulemap: path.join(localDevPublicPath, 'module-map.json'),
        oneAppDevCdnAddress: `http://localhost:${process.env.HTTP_ONE_APP_DEV_CDN_PORT}`,
      })) : {}),
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

  // eslint-disable-next-line consistent-return
  oneAppDevCdn.get('*', (req, res) => {
    const incomingRequestPath = req.path;

    if (matchPathToKnownRemoteModuleUrl(incomingRequestPath, remoteModuleBaseUrls)) {
      const knownRemoteModuleBaseUrl = matchPathToKnownRemoteModuleUrl(
        incomingRequestPath,
        remoteModuleBaseUrls
      );
      const remoteModuleBaseUrlOrigin = new URL(knownRemoteModuleBaseUrl).origin;
      got(`${remoteModuleBaseUrlOrigin}/${req.path}`, {
        headers: { connection: 'keep-alive' },
        agent: new ProxyAgent(),
      })
        .then(remoteModuleResponse => remoteModuleResponse.body)
        .then(
          remoteModuleResponse => res
            .status(200)
            .type(path.extname(req.path))
            .send(remoteModuleResponse),
          err => res
            .status(500)
            .send(err.message)
        );
    } else {
      return res
        .status(404)
        .send('Not found');
    }
  });

  return oneAppDevCdn;
};
