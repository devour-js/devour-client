const serialize = require('./_serialize')

module.exports = {
  name: 'POST',
  req: (payload)=> {
    let jsonApi = payload.jsonApi

    if(payload.req.method === 'POST') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
      if(payload.req.data.constructor === Array) {
        payload.req.data = {
            data: serialize.collection.call(jsonApi, payload.req.model, payload.req.data)
        }
      }else{
        payload.req.data = {
          data: serialize.resource.call(jsonApi, payload.req.model, payload.req.data)
        }
      }
    }

    return payload
  }
}
