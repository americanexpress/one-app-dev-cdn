import fs from 'fs';

import {
  getCachedModules,
  setOnCache,
  removeModuleFromCache,
  showCacheInfo,
  setupCacheFile,
  fileName,
  directoryName,
  directoryPath,
  filePath,
} from '../../src/util';

/* eslint-disable no-console -- console used in tests */

jest.mock('fs');

describe('Cache module', () => {
  jest.spyOn(console, 'log');
  jest.spyOn(console, 'error');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showCacheInfo', () => {
    it('should log file size in MB and instructions on how to delete the cache', () => {
      fs.stat.mockImplementationOnce((_filePath, cb) => cb(null, { size: 1024 * 1024 }));
      showCacheInfo();
      expect(console.log).toHaveBeenCalledWith(`File size of ${fileName}: 1.00 MB`);
      expect(console.log).toHaveBeenCalledWith(`To delete cache, please run \n rm ${filePath}`);
    });

    it('should log error when unable to check file stat', () => {
      const error = new Error('Cannot access file');
      fs.stat.mockImplementationOnce((_filePath, cb) => cb(error, null));
      showCacheInfo();
      expect(console.error).toHaveBeenCalledWith('There was error checking file stat', error);
    });
  });

  describe('setupCacheFile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log success message when directory and file are created', () => {
      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => ({}));

      setupCacheFile();

      expect(console.log).toHaveBeenCalledWith(`Successfully created ${directoryPath}`);
      expect(console.log).toHaveBeenCalledWith(`Creating ${fileName}`);
      expect(console.log).toHaveBeenCalledWith(`${fileName} created successfully on ${filePath}`);
    });

    it('should log error when unable to create a directory', () => {
      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(new Error('Error creating directory')));
      fs.writeFileSync.mockImplementationOnce(() => {});

      setupCacheFile();
      expect(console.error).toHaveBeenCalledWith(`There was error creating ${directoryName} directory`);
    });

    it('should log error when unable to create a file', () => {
      const error = new Error('Cannot create file');

      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => { throw error; });
      setupCacheFile();
      expect(console.error).toHaveBeenCalledWith(`Error creating ${fileName} on ${filePath}, \n${error}`);
    });
  });

  describe('getCachedModules', () => {
    it('should return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);

      const result = getCachedModules();

      expect(result).toEqual({});
    });

    it('should create a new cache file and return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => {});

      const result = getCachedModules();

      expect(console.log).toHaveBeenCalledWith(`Successfully created ${directoryPath}`);
      expect(console.log).toHaveBeenCalledWith(`${fileName} created successfully on ${filePath}`);
      expect(result).toEqual({});
    });

    it('should return an empty object if the cache file contains invalid JSON', () => {
      const invalidJSON = 'invalid JSON';
      fs.existsSync.mockImplementationOnce(() => true);
      fs.readFileSync.mockImplementationOnce(() => invalidJSON);

      const result = getCachedModules();
      let error;
      try {
        JSON.parse(invalidJSON);
      } catch (err) {
        error = err;
      }
      expect(console.error).toHaveBeenCalledWith('Could not parse JSON content', error);
      expect(result).toEqual({});
    });

    it('should return the content of the cache file as a JSON object if the cache file exists and contains valid JSON', () => {
      const validJSON = '{"module":"test"}';
      fs.existsSync.mockImplementationOnce(() => true);
      fs.readFileSync.mockImplementationOnce(() => validJSON);

      const result = getCachedModules();

      expect(result).toEqual(JSON.parse(validJSON));
    });
  });
});

/* eslint-enable no-console -- because eslint-comments/disable-enable-pair */
