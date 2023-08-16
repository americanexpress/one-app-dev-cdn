import path from 'path';
import fs from 'fs';
/* eslint-disable no-console -- console used in tests */
const chalk = require('chalk');

export const getUserHomeDirectory = () => process.env.HOME || process.env.USERPROFILE;
export const cacheFileName = '.one-app-module-cache';
export const oneAppDirectoryName = '.one-app';
export const oneAppDirectoryPath = path.join(getUserHomeDirectory(), oneAppDirectoryName);
export const oneAppModuleCachePath = path.join(oneAppDirectoryPath, cacheFileName);

// show cache size and how to delete info on start
export const showCacheInfo = () => {
  fs.stat(oneAppModuleCachePath, (error, stats) => {
    if (error) {
      console.error('There was error checking file stat', error);
    } else {
      const fileSizeOnMB = stats.size / (1024 * 1024); // bytes to mb
      const message = `File size of ${cacheFileName}: ${chalk.bold.greenBright(fileSizeOnMB.toFixed(2), 'MB')}`;
      const separator = '*'.repeat(message.length);
      console.log(chalk.bold.cyanBright(separator));
      console.log(chalk.bold.redBright('CACHE INFORMATION'));
      console.log(message);
      console.log(`To delete cache, please run \n  ${chalk.bold.redBright('  rm ', oneAppModuleCachePath)}`);
      console.log(chalk.bold.cyanBright(separator));
    }
  });
};

// setup folder and file
export const setupCacheFile = () => {
  fs.mkdir(oneAppDirectoryPath, { recursive: true }, (error) => {
    if (error) {
      console.error(`There was error creating ${oneAppDirectoryName} directory`);
    } else {
      console.log(`Successfully created ${oneAppDirectoryPath}`);
      console.log(`Creating ${cacheFileName}`);
      try {
        fs.writeFileSync(oneAppModuleCachePath, JSON.stringify('{}'));
        console.log(`${cacheFileName} created successfully on ${oneAppModuleCachePath}`);
      } catch (err) {
        console.error(`Error creating ${cacheFileName} on ${oneAppModuleCachePath}, \n${err}`);
      }
    }
  });
};

// gets cached module from ~/.one-app/.one-app-module-cache
export const getCachedModules = () => {
  let hasCachedFile = false;
  if (fs.existsSync(oneAppModuleCachePath)) {
    hasCachedFile = true;
  } else {
    setupCacheFile();
  }
  if (hasCachedFile) {
    try {
      showCacheInfo();
      const cachedContent = fs.readFileSync(oneAppModuleCachePath, 'utf8');
      return JSON.parse(cachedContent);
    } catch (err) {
      console.error('Could not parse JSON content', err);
    }
  }
  return {};
};

let timerId = null;

export const writeToCache = (content, delay = 500) => {
  // added debounce
  clearTimeout(timerId);
  timerId = setTimeout(() => {
    fs.writeFile(oneAppModuleCachePath, JSON.stringify(content, null, 2), (error) => {
      if (error) {
        console.log(`There was an error updating content \n ${error}`);
      }
    });
    timerId = null;
  }, delay);
};

export const removeDuplicatedModules = (url, cachedModules, moduleNames) => {
  const matchingModule = moduleNames.find((moduleName) => url.match(new RegExp(`\\b\\/${moduleName}\\/\\b`)));

  const updatedCachedModules = cachedModules;
  Object.keys(updatedCachedModules).forEach((cachedModuleKey) => {
    if (cachedModuleKey.match(new RegExp(`\\b\\/${matchingModule}\\/\\b`))) {
      delete updatedCachedModules[cachedModuleKey];
      console.log(`Deleted ${cachedModuleKey} from cache`);
    }
  });
  return updatedCachedModules;
};

/* eslint-enable no-console -- because eslint-comments/disable-enable-pair */
