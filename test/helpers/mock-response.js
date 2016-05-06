export default function (jsonApi, res = {}) {
  jsonApi.middleware.unshift({
    name: 'mock-response',
    req: (payload) => {
      payload.req.adapter = function (resolve) {
        resolve(res)
      }
      return payload
    }
  })
}
