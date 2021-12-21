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

/* eslint-disable no-console -- disable for tests */
// native
import path from 'path';
import fs from 'fs';

// dependencies
import Fastify from 'fastify';
import got from 'got';
import compress from 'fastify-compress';
import fastifyStatic from 'fastify-static';
import cors from 'fastify-cors';
import ip from 'ip';
import ProxyAgent from 'proxy-agent';

const getLocalModuleMap = ({ pathToModuleMap, oneAppDevCdnAddress }) => {
  const moduleMap = JSON.parse(fs.readFileSync(pathToModuleMap, 'utf8').toString());
  Object.keys(moduleMap.modules).forEach((moduleName) => {
    const module = moduleMap.modules[moduleName];
    module.browser.url = module.browser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.legacyBrowser.url = module.legacyBrowser.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
    module.node.url = module.node.url.replace('[one-app-dev-cdn-url]', oneAppDevCdnAddress);
  });
  return JSON.stringify(moduleMap, null, 2);
};

const matchPathToKnownRemoteModuleUrl = (
  incomingRequestPath,
  remoteModuleBaseUrls
) => remoteModuleBaseUrls.find((remoteModuleBaseUrl) => {
  const remoteModuleUrlOrigin = new URL(remoteModuleBaseUrl).origin;
  const remoteModulePath = remoteModuleBaseUrl.replace(remoteModuleUrlOrigin, '');

  return incomingRequestPath.startsWith(remoteModulePath);
});

const oneAppDevCdnFactory = ({
  localDevPublicPath,
  remoteModuleMapUrl,
  useLocalModules,
  appPort,
  useHost,
  routePrefix = '',
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

  const oneAppDevCdn = Fastify({ logger: true });

  if (process.env.NODE_ENV === 'production') {
    console.warn('do not include one-app-dev-cdn in production');
    return oneAppDevCdn;
  }

  oneAppDevCdn.register(compress);
  oneAppDevCdn.register(cors, {
    origin: [
      `http://localhost:${appPort}`,
      `http://${ip.address()}:${appPort}`,
      undefined,
    ],
  });
  // for locally served modules
  // oneAppDevCdn.use('/modules', express.static());
  oneAppDevCdn.register(fastifyStatic, {
    root: `${localDevPublicPath}/modules`,
    prefix: `${routePrefix}/modules`,
    index: false,
  });

  let remoteModuleBaseUrls = [];
  // support one-app-cli's "serve-module"
  // merge local with remote, with local taking preference
  oneAppDevCdn.get(`${routePrefix}/module-map.json`, (req, reply) => {
    const hostAddress = useHost ? `http://${req.headers.host}` : `http://localhost:${process.env.HTTP_ONE_APP_DEV_CDN_PORT}`;
    Promise.allSettled([
      remoteModuleMapUrl
        ? got(remoteModuleMapUrl, {
          agent: {
            https: new ProxyAgent(),
            http: new ProxyAgent(),
          },
        }).then(
          (r) => {
            // clear out remoteModuleBaseUrls as the new module map now has different urls in it
            // not clearing would result in an ever growing array
            remoteModuleBaseUrls = [];

            const remoteModuleMap = JSON.parse(r.body);
            const { modules } = remoteModuleMap;
            const oneAppDevStaticsAddress = `${hostAddress}/static`;
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
          }
        ).catch((error) => {
          console.warn(
            `one-app-dev-cdn error loading module map from ${remoteModuleMapUrl}: ${error}`
          );
          return {};
        })
        : {},
      useLocalModules ? JSON.parse(getLocalModuleMap({
        pathToModuleMap: path.join(localDevPublicPath, 'module-map.json'),
        oneAppDevCdnAddress: hostAddress,
      })) : {},
    ])
      .then(([remoteMapRequest, localMapRequest]) => {
        // remoteMap always fulfilled
        const remoteMap = remoteMapRequest.value;
        const localMap = localMapRequest.value;

        const map = {
          ...remoteMap,
          key: 'not-used-in-development',
          modules: {
            ...remoteMap.modules,
            ...localMap.modules,
          },
        };

        reply
          .code(200)
          .send(map);
      });
  });

  oneAppDevCdn.get('*', (req, reply) => {
    const incomingRequestPath = req.path;

    if (matchPathToKnownRemoteModuleUrl(incomingRequestPath, remoteModuleBaseUrls)) {
      const knownRemoteModuleBaseUrl = matchPathToKnownRemoteModuleUrl(
        incomingRequestPath,
        remoteModuleBaseUrls
      );
      const remoteModuleBaseUrlOrigin = new URL(knownRemoteModuleBaseUrl).origin;
      got(`${remoteModuleBaseUrlOrigin}/${req.path}`, {
        headers: { connection: 'keep-alive' },
        agent: {
          https: new ProxyAgent(),
          http: new ProxyAgent(),
        },
      })
        .then((remoteModuleResponse) => reply
          .code(remoteModuleResponse.statusCode)
          .type(path.extname(req.path))
          .send(remoteModuleResponse.body))
        .catch((err) => {
          const status = err.code === 'ERR_NON_2XX_3XX_RESPONSE' ? err.response.statusCode : 500;
          return reply
            .status(status)
            .send(err.message);
        });
    } else {
      reply
        .code(404)
        .send('Not found');
    }
  });

  return oneAppDevCdn;
};

/* eslint-enable no-console -- because eslint-comments/disable-enable-pair */
export default oneAppDevCdnFactory;
