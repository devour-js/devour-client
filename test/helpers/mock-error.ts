import { Payload } from '../../lib/middleware/interfaces/payload';

export default function (jsonApi, res = {}, errors = null) {
  const mockResponse = {
    name: 'mock-error',
    req: (payload: Payload) => {
      payload.req.adapter = () => Promise.reject(res);
      return payload;
    },
    error: () => {
      return { response: { data: { errors } } };
    }
  };
  // if we already mocked something replace it
  if (jsonApi.middleware[0].name === mockResponse.name) {
    jsonApi.middleware[0] = mockResponse;
  } else {
    jsonApi.middleware.unshift(mockResponse);
  }
}
