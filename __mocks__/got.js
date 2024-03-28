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

const got = jest.createMockFromModule('got');

got.mockReturnJsonOnce = (obj, statusCode = 200) => {
  if (obj instanceof Error) {
    got.mockImplementationOnce(() => Promise.reject(obj));
  }

  got.mockImplementationOnce(() => Promise.resolve({ body: JSON.stringify(obj), statusCode }));
};

got.mockReturnFileOnce = (body, statusCode = 200) => {
  if (body instanceof Error) {
    got.mockImplementationOnce(() => Promise.reject(body));
  }

  got.mockImplementationOnce(() => Promise.resolve({ body, statusCode }));
};

export default got;
