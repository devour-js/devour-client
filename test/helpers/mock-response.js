export default function (jsonApi, res = {}) {
  let mockResponse = {
    name: 'mock-response',
    req: (payload) => {
      payload.req.adapter = function () {
        return Promise.resolve(res)
      }
      return payload
    }
  }
  // if we already mocked something replace it
  if (jsonApi.middleware[0].name === mockResponse.name) {
    jsonApi.middleware[0] = mockResponse
  } else {
    jsonApi.middleware.unshift(mockResponse)
  }
}
