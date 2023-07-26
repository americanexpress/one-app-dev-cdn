/* eslint-disable no-console -- console used in tests */

import path from 'path';
import fs from 'fs';

import {
  getCachedModules, setOnCache, removeModuleFromCache, showCacheInfo,
} from '../../src/util';

jest.mock('path');
jest.mock('fs');

describe('utils', () => {
  jest.spyOn(console, 'log');
  jest.spyOn(console, 'error');

  beforeEach(() => {
    fs.stat.mockClear();
  });

  it('should show cache info', () => {
    const stats = {
      size: 1024 * 1024,
    };
    fs.stat.mockImplementation((filePath, cb) => cb(null, stats));

    showCacheInfo();
    expect(fs.stat).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('File size of .one-app-module-cache: 1.00 MB');
  });

  it('should handle error when file stat fails', () => {
    const error = new Error('stat error');
    fs.stat.mockImplementation((filePath, cb) => cb(error, null));

    showCacheInfo();
    expect(fs.stat).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('There was error checking file stat', error);
  });
});
/* eslint-enable no-console -- because eslint-comments/disable-enable-pair */
