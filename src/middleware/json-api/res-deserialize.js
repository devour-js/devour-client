const deserialize = require('./_deserialize')
const _ = require('lodash')

function needsDeserialization (method) {
  return ['GET', 'PATCH', 'POST'].indexOf(method) !== -1
}

function isCollection (responseData) {
  return _.isArray(responseData)
}

module.exports = {
  name: 'response',
  res: function (payload) {
    /*
     *   Note: The axios ajax response attaches the actual response data to
     *         `res.data`. JSON API Resources also passes back the response with
     *         a `data` attribute. This means we have `res.data.data`.
     */
    let jsonApi = payload.jsonApi
    let req = payload.req
    let res = payload.res.data
    let included = res.included

    let deserializedResponse = null

    if (needsDeserialization(req.method)) {
      if (isCollection(res.data)) {
        deserializedResponse = deserialize.collection.call(jsonApi, res.data, included, req.model)
      } else {
        deserializedResponse = deserialize.resource.call(jsonApi, res.data, included, req.model)
      }
    }

    if (res) {
      var params = ['meta', 'links']
      params.forEach(function (param) {
        deserializedResponse[param] = res[param]
      })
    }

    return deserializedResponse
  }
}
