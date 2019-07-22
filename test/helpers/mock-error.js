export default function (jsonApi, res = {}, errors = null) {
  let mockResponse = {
    name: 'mock-error',
    req: (payload) => {
      payload.req.adapter = function () {
        return Promise.reject(res)
      }
      return payload
    },
    error: () => {
      return { response: { data: { errors } } }
    }
  }
  // if we already mocked something replace it
  if (jsonApi.middleware[0].name === mockResponse.name) {
    jsonApi.middleware[0] = mockResponse
  } else {
    jsonApi.middleware.unshift(mockResponse)
  }
}
