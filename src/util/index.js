import path from 'path';
import fs from 'fs';
/* eslint-disable no-console -- console used in tests */
const chalk = require('chalk');

export const getUserHomeDirectory = () => process.env.HOME || process.env.USERPROFILE;
export const fileName = '.one-app-module-cache';
export const directoryName = '.one-app';
export const directoryPath = path.join(getUserHomeDirectory(), directoryName);
export const filePath = path.join(directoryPath, fileName);

// show cache size and how to delete info on start
export const showCacheInfo = () => {
  fs.stat(filePath, (error, stats) => {
    if (error) {
      console.error('There was error checking file stat', error);
    } else {
      const fileSizeOnMB = stats.size / (1024 * 1024); // bytes to mb
      const message = `File size of ${fileName}: ${chalk.bold.greenBright(fileSizeOnMB.toFixed(2), 'MB')}`;
      const separator = '*'.repeat(message.length);
      console.log(chalk.bold.cyanBright(separator));
      console.log(chalk.bold.redBright('CACHE INFORMATION'));
      console.log(message);
      console.log(`To delete cache, please run \n  ${chalk.bold.redBright('  rm ', filePath)}`);
      console.log(chalk.bold.cyanBright(separator));
    }
  });
};

// setup folder and file
export const setupCacheFile = () => {
  fs.mkdir(directoryPath, { recursive: true }, (error) => {
    if (error) {
      console.error(`There was error creating ${directoryName} directory`);
    } else {
      console.log(`Successfully created ${directoryPath}`);
      console.log(`Creating ${fileName}`);
      try {
        fs.writeFileSync(filePath, JSON.stringify('{}'));
        console.log(`${fileName} created successfully on ${filePath}`);
      } catch (err) {
        console.error(`Error creating ${fileName} on ${filePath}, \n${err}`);
      }
    }
  });
};

// gets cached module from ~/.one-app/.one-app-module-cache
export const getCachedModules = () => {
  let hasCachedFile = false;
  if (fs.existsSync(filePath)) {
    hasCachedFile = true;
  } else {
    setupCacheFile();
  }
  if (hasCachedFile) {
    try {
      showCacheInfo();
      const cachedContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(cachedContent);
    } catch (err) {
      console.error('Could not parse JSON content', err);
    }
  }
  return {};
};

let timerId = null;

export const setOnCache = (content, delay = 500) => {
  // added debounce
  clearTimeout(timerId);
  timerId = setTimeout(() => {
    fs.writeFile(filePath, JSON.stringify(content, null, 2), (error) => {
      if (error) {
        console.log(`There was an error updating content \n ${error}`);
      }
    });
    timerId = null;
  }, delay);
};

export const optimizeCache = (url, cachedModules, moduleNames) => {
  const matchingModule = moduleNames.find((moduleName) => url.match(new RegExp(`\\b\\/${moduleName}\\/\\b`)));

  if (!matchingModule) return { ...cachedModules };

  const updatedCachedModules = Object.keys(cachedModules).reduce((acc, cachedModuleKey) => {
    if (cachedModuleKey.match(new RegExp(`\\b\\/${matchingModule}\\/\\b`))) {
      console.log(`Deleted ${cachedModuleKey} from cache`);
    } else {
      acc[cachedModuleKey] = cachedModules[cachedModuleKey];
    }
    return acc;
  }, {});

  return updatedCachedModules;
};

/* eslint-enable no-console -- because eslint-comments/disable-enable-pair */
