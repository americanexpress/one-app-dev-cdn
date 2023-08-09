import fs from 'fs';

import {
  getCachedModules,
  setOnCache,
  showCacheInfo,
  setupCacheFile,
  fileName,
  directoryName,
  directoryPath,
  filePath,
} from '../../src/util';

jest.mock('fs');

describe('Cache module utils', () => {
  let logSpy;
  let errorSpy;
  const originalProcessEnv = process.env;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log');
    errorSpy = jest.spyOn(console, 'error');
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.env = originalProcessEnv;
  });

  it('should get USERPROFILE for windows user', () => {
    process.env = { ...originalProcessEnv, HOME: null, USERPROFILE: 'Users/windows' };
    expect(directoryPath).toBe('Users/windows/.one-app');
  });

  describe('showCacheInfo', () => {
    it('should log file size in MB and instructions on how to delete the cache', () => {
      fs.stat.mockImplementationOnce((_filePath, cb) => cb(null, { size: 1024 * 1024 }));
      showCacheInfo();
      expect(logSpy).toHaveBeenCalledWith(`File size of ${fileName}: 1.00 MB`);
      expect(logSpy).toHaveBeenCalledWith(`To delete cache, please run \n rm ${filePath}`);
    });

    it('should log error when unable to check file stat', () => {
      const error = new Error('Cannot access file');
      fs.stat.mockImplementationOnce((_filePath, cb) => cb(error, null));
      showCacheInfo();
      expect(errorSpy).toHaveBeenCalledWith('There was error checking file stat', error);
    });
  });

  describe('setupCacheFile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      fs.mkdir.mockRestore();
      fs.writeFileSync.mockRestore();
    });

    it('should log success message when directory and file are created', () => {
      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => ({}));

      setupCacheFile();

      expect(logSpy).toHaveBeenCalledWith(`Successfully created ${directoryPath}`);
      expect(logSpy).toHaveBeenCalledWith(`Creating ${fileName}`);
      expect(logSpy).toHaveBeenCalledWith(`${fileName} created successfully on ${filePath}`);
    });

    it('should log error when unable to create a directory', () => {
      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(new Error('Error creating directory')));
      fs.writeFileSync.mockImplementationOnce(() => {});

      setupCacheFile();
      expect(errorSpy).toHaveBeenCalledWith(`There was error creating ${directoryName} directory`);
      fs.mkdir.mockRestore();
    });

    it('should log error when unable to create a file', () => {
      const error = new Error('Cannot create file');

      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => { throw error; });
      setupCacheFile();
      expect(errorSpy).toHaveBeenCalledWith(`Error creating ${fileName} on ${filePath}, \n${error}`);
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

      expect(logSpy).toHaveBeenCalledWith(`Successfully created ${directoryPath}`);
      expect(logSpy).toHaveBeenCalledWith(`${fileName} created successfully on ${filePath}`);
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
      expect(errorSpy).toHaveBeenCalledWith('Could not parse JSON content', error);
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

  describe('setOnCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set content on cache after a delay', () => {
      fs.writeFile.mockImplementation((_filePath, content, callback) => callback(null));

      const content = { module: 'test' };
      setOnCache(content);

      expect(fs.writeFile).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.writeFile.mock.calls[0][1]).toBe(JSON.stringify(content, null, 2));
    });

    it('should handle error when writing to file fails', () => {
      const error = new Error('write error');
      fs.writeFile.mockImplementation((_filePath, content, callback) => callback(error));

      const content = { module: 'test' };
      setOnCache(content);

      jest.runAllTimers();

      expect(fs.writeFile).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(`There was an error updating content \n ${error}`);
    });
  });
});
