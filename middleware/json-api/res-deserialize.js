import deserialize from './_deserialize'
import _ from 'lodash'

function needsDeserialization(method) {
  return ['GET', 'PATCH', 'POST'].indexOf(method) !== -1
}

function isCollection(responseData) {
  return _.isArray(responseData)
}

export default {
  name: 'response',
  res: function(payload) {
    /*
    *   Note: The axios ajax response attaches the actual response data to
    *         `res.data`. JSON API Resources also passes back the response with
    *         a `data` attribute. This means we have `res.data.data`.
    */
    let jsonApi  = payload.jsonApi
    let req      = payload.req
    let res      = payload.res.data
    let included = res.included

    let deserializedResponse = null

    if(needsDeserialization(req.method)) {
      if(isCollection(res.data)) {
        deserializedResponse = deserialize.collection.call(jsonApi, res.data, included)
      }else{
        deserializedResponse = deserialize.resource.call(jsonApi, res.data, included)
      }
    }

    if(res && res.meta) {
      deserializedResponse.meta = res.meta
    }

    return deserializedResponse
  }
}
