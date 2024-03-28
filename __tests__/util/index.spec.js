import fs from 'fs';

import {
  getUserHomeDirectory,
  getCachedModuleFiles,
  writeToCache,
  removeExistingEntryIfConflicting,
  showCacheInfo,
  setupCacheFile,
  cacheFileName,
  oneAppDirectoryName,
  oneAppDirectoryPath,
  oneAppModuleCachePath,
} from '../../src/util';

jest.mock('fs');

describe('Cache module utils', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log');
    errorSpy = jest.spyOn(console, 'error');
    process.env.HOME = '';
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should get USERPROFILE for windows user', () => {
    delete process.env.HOME;
    process.env.USERPROFILE = 'Users/windows';
    expect(getUserHomeDirectory()).toBe('Users/windows');
  });

  describe('showCacheInfo', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should display the cache info when there is no error', () => {
      const mockStats = {
        size: 1048576 * 5, // 5 MB
      };

      fs.stat.mockImplementation((path, callback) => {
        callback(null, mockStats);
      });

      showCacheInfo();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CACHE INFORMATION'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('File size of'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('5.00 MB'));
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should display an error when there is an error checking file stats', () => {
      const mockError = new Error('Test error');

      fs.stat.mockImplementation((path, callback) => {
        callback(mockError, null);
      });

      showCacheInfo();

      expect(errorSpy).toHaveBeenCalledWith('There was error checking file stat', mockError);
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
      expect(fs.writeFileSync).toHaveBeenCalledWith(oneAppModuleCachePath, JSON.stringify({}));
      expect(logSpy).toHaveBeenCalledWith(`Successfully created ${oneAppDirectoryPath}`);
      expect(logSpy).toHaveBeenCalledWith(`Creating ${cacheFileName}`);
      expect(logSpy).toHaveBeenCalledWith(`${cacheFileName} created successfully on ${oneAppModuleCachePath}`);
    });

    it('should log error when unable to create a directory', () => {
      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(new Error('Error creating directory')));
      fs.writeFileSync.mockImplementationOnce(() => {});

      setupCacheFile();
      expect(errorSpy).toHaveBeenCalledWith(`There was error creating ${oneAppDirectoryName} directory`);
      fs.mkdir.mockRestore();
    });

    it('should log error when unable to create a file', () => {
      const error = new Error('Cannot create file');

      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => { throw error; });
      setupCacheFile();
      expect(errorSpy).toHaveBeenCalledWith(`Error creating ${cacheFileName} on ${oneAppModuleCachePath}, \n${error}`);
    });
  });

  describe('getCachedModuleFiles', () => {
    it('should return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);

      const result = getCachedModuleFiles();

      expect(result).toEqual({});
    });

    it('should create a new cache file and return an empty object if the cache file does not exist', () => {
      fs.existsSync.mockImplementationOnce(() => false);
      fs.mkdir.mockImplementationOnce((_filePath, options, cb) => cb(null));
      fs.writeFileSync.mockImplementationOnce(() => {});

      const result = getCachedModuleFiles();

      expect(logSpy).toHaveBeenCalledWith(`Successfully created ${oneAppDirectoryPath}`);
      expect(logSpy).toHaveBeenCalledWith(`${cacheFileName} created successfully on ${oneAppModuleCachePath}`);
      expect(result).toEqual({});
    });

    it('should return an empty object if the cache file contains invalid JSON', () => {
      const invalidJSON = 'invalid JSON';
      fs.existsSync.mockImplementationOnce(() => true);
      fs.readFileSync.mockImplementationOnce(() => invalidJSON);

      const result = getCachedModuleFiles();
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

      const result = getCachedModuleFiles();

      expect(result).toEqual(JSON.parse(validJSON));
    });
  });

  describe('writeToCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set content on cache after a delay', () => {
      fs.writeFile.mockImplementation((_filePath, content, callback) => callback(null));

      const content = { module: 'test' };
      writeToCache(content);

      expect(fs.writeFile).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.writeFile.mock.calls[0][1]).toBe(JSON.stringify(content, null, 2));
    });

    it('should handle error when writing to file fails', () => {
      const error = new Error('write error');
      fs.writeFile.mockImplementation((_filePath, content, callback) => callback(error));

      const content = { module: 'test' };
      writeToCache(content);

      jest.runAllTimers();

      expect(fs.writeFile).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(`There was an error updating content \n ${error}`);
    });
  });

  describe('removeExistingEntryIfConflicting', () => {
    it('removes the matching modules from cachedModules', () => {
      const url = '/path/to/moduleA/2.2.3/file.js';
      const cachedModules = {
        '/path/to/moduleA/1.2.3/file.js': 'data',
        '/path/to/moduleA/1.2.3/file.json': 'data',
        '/path/to/moduleB/1.2.3/file.js': 'data',
      };
      const moduleNames = ['moduleA', 'moduleB', 'moduleC'];

      const result = removeExistingEntryIfConflicting(url, cachedModules, moduleNames);

      expect(result).toEqual({
        '/path/to/moduleA/1.2.3/file.json': 'data',
        '/path/to/moduleB/1.2.3/file.js': 'data',
      });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('returns cachedModules unchanged if no module matches', () => {
      const url = '/path/to/moduleC/2.2.3/file.js';
      const cachedModules = {
        '/path/to/moduleA/1.2.3/file.js': 'data',
        '/path/to/moduleA/1.2.3/file.json': 'data',
        '/path/to/moduleB/1.2.3/file.js': 'data',
      };
      const moduleNames = ['moduleA', 'moduleB', 'moduleC'];

      const result = removeExistingEntryIfConflicting(url, cachedModules, moduleNames);

      expect(result).toEqual(cachedModules);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
