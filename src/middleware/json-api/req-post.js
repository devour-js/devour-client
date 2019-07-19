const serialize = require('./_serialize')

module.exports = {
  name: 'POST',
  req: (payload) => {
    let jsonApi = payload.jsonApi

    if (payload.req.method === 'POST') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
      const serializer = payload.req.data.constructor === Array ? serialize.collection : serialize.resource

      payload.req.data = {
        data: serializer.call(jsonApi, payload.req.model, payload.req.data),
        meta: payload.req.meta
      }
    }

    return payload
  }
}
