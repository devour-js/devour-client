const deserialize = require('./_deserialize')
const _isArray = require('lodash/isArray')

function needsDeserialization (method) {
  return ['GET', 'PATCH', 'POST'].indexOf(method) !== -1
}

function isCollection (responseData) {
  return _isArray(responseData)
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
    let status = payload.res.status
    let req = payload.req
    let res = payload.res.data
    let errors = res.errors
    let meta = res.meta
    let links = res.links
    let included = res.included

    let data = null

    if (status !== 204 && needsDeserialization(req.method)) {
      if (isCollection(res.data)) {
        data = deserialize.collection.call(jsonApi, res.data, included)
      } else if (res.data) {
        data = deserialize.resource.call(jsonApi, res.data, included)
      }
    }

    if (res.data && data) {
      var params = ['meta', 'links']
      params.forEach(function (param) {
        if (res.data[param]) {
          data[param] = res.data[param]
        }
      })
    }

    return { data, errors, meta, links }
  }
}
