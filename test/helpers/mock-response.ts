import { Payload } from '../../lib/middleware/interfaces/payload';

export default function (jsonApi, res = {}) {
  const mockResponse = {
    name: 'mock-response',
    req: (payload: Payload) => {
      payload.req.adapter = () => Promise.resolve(res);
      return payload;
    }
  };
  // if we already mocked something replace it
  if (jsonApi.middleware[0].name === mockResponse.name) {
    jsonApi.middleware[0] = mockResponse;
  } else {
    jsonApi.middleware.unshift(mockResponse);
  }
}
