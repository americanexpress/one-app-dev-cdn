import fs from 'fs';

import {
  getUserHomeDirectory,
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

  describe('removeModuleFromCache', () => {
    it('should remove all matched module entries from cache', () => {
      const url = '/api/v1/moduleA/endpoint';
      const modules = {
        '/api/v1/moduleA/endpoint': 'dataA',
        '/api/v1/moduleA/anotherEndpoint': 'dataA1',
        '/api/v1/moduleB/endpoint': 'dataB',
      };
      const moduleNames = ['moduleA', 'moduleC'];

      const result = removeModuleFromCache(url, modules, moduleNames);

      expect(result['/api/v1/moduleA/endpoint']).toBeUndefined();
      expect(result['/api/v1/moduleA/anotherEndpoint']).toBeUndefined();
      expect(result['/api/v1/moduleB/endpoint']).toBeDefined();
    });

    it('should not remove non-matched module entries from cache', () => {
      const url = '/api/v1/moduleX/endpoint';
      const modules = {
        '/api/v1/moduleA/endpoint': 'dataA',
        '/api/v1/moduleB/endpoint': 'dataB',
      };
      const moduleNames = ['moduleA', 'moduleC'];

      const result = removeModuleFromCache(url, modules, moduleNames);

      expect(result['/api/v1/moduleA/endpoint']).toBeDefined();
      expect(result['/api/v1/moduleB/endpoint']).toBeDefined();
    });

    it('should handle empty moduleNames', () => {
      const url = '/api/v1/moduleA/endpoint';
      const modules = {
        '/api/v1/moduleA/endpoint': 'dataA',
        '/api/v1/moduleB/endpoint': 'dataB',
      };
      const moduleNames = [];

      const result = removeModuleFromCache(url, modules, moduleNames);

      expect(result['/api/v1/moduleA/endpoint']).toBeDefined();
      expect(result['/api/v1/moduleB/endpoint']).toBeDefined();
    });

    it('should handle URL not in cache', () => {
      const url = '/api/v1/moduleZ/endpoint';
      const modules = {
        '/api/v1/moduleA/endpoint': 'dataA',
        '/api/v1/moduleB/endpoint': 'dataB',
      };
      const moduleNames = ['moduleA', 'moduleZ'];

      const result = removeModuleFromCache(url, modules, moduleNames);

      expect(result['/api/v1/moduleA/endpoint']).toBeDefined();
      expect(result['/api/v1/moduleB/endpoint']).toBeDefined();
      expect(result['/api/v1/moduleZ/endpoint']).toBeUndefined();
    });

    // Edge cases:
    it('should handle non-matching URL but with module in cache', () => {
      const url = '/api/v1/moduleZ/endpoint';
      const modules = {
        '/api/v1/moduleA/endpoint': 'dataA',
        '/api/v1/moduleB/endpoint': 'dataB',
      };
      const moduleNames = ['moduleA', 'moduleC'];

      const result = removeModuleFromCache(url, modules, moduleNames);

      expect(result['/api/v1/moduleA/endpoint']).toBeDefined();
      expect(result['/api/v1/moduleB/endpoint']).toBeDefined();
    });
  });
});
