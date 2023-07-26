import path from 'path';
import fs from 'fs';
import Lumberjack, { monkeypatches } from '@americanexpress/lumberjack';

const logger = new Lumberjack();
monkeypatches.replaceGlobalConsole(logger);

/* eslint-disable no-console -- console used in tests */

const userHomeDirectory = process.env.HOME || process.env.USERPROFILE;
const fileName = '.one-app-module-cache';
const directoryName = '.one-app';
const directoryPath = path.join(userHomeDirectory, directoryName);
const filePath = path.join(directoryPath, fileName);

// show cache size and how to delete info on start
export const showCacheInfo = () => {
  fs.stat(filePath, (error, stats) => {
    if (error) {
      console.error('There was error checking file stat', error);
    } else {
      const fileSizeOnMB = stats.size / (1024 * 1024); // bytes to mb
      console.log(`File size of ${fileName}: ${fileSizeOnMB.toFixed(2)} MB`);
      console.log(`To delete cache, please run \n rm ${filePath}`);
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

export const removeModuleFromCache = (url, _cachedModules, moduleNames) => {
  const updatedCachedModules = _cachedModules;
  moduleNames.forEach((moduleName) => {
    if (url.match(new RegExp(`\\b\\/${moduleName}\\/\\b`))) {
      delete updatedCachedModules[url];
      console.log(`Deleted ${url} from cache`);
    }
  });
  return updatedCachedModules;
};

/* eslint-enable no-console -- because eslint-comments/disable-enable-pair */
