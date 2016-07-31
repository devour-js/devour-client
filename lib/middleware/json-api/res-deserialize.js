'use strict';

var deserialize = require('./_deserialize');
var _ = require('lodash');

function needsDeserialization(method) {
  return ['GET', 'PATCH', 'POST'].indexOf(method) !== -1;
}

function isCollection(responseData) {
  return _.isArray(responseData);
}

module.exports = {
  name: 'response',
  res: function res(payload) {
    /*
     *   Note: The axios ajax response attaches the actual response data to
     *         `res.data`. JSON API Resources also passes back the response with
     *         a `data` attribute. This means we have `res.data.data`.
     */
    var jsonApi = payload.jsonApi;
    var status = payload.res.status;
    var req = payload.req;
    var res = payload.res.data;
    var included = res.included;

    var deserializedResponse = null;

    if (status !== 204 && needsDeserialization(req.method)) {
      if (isCollection(res.data)) {
        deserializedResponse = deserialize.collection.call(jsonApi, res.data, included, req.model);
      } else if (res.data) {
        deserializedResponse = deserialize.resource.call(jsonApi, res.data, included, req.model);
      }
    }

    if (res && deserializedResponse) {
      var params = ['meta', 'links'];
      params.forEach(function (param) {
        deserializedResponse[param] = res[param];
      });
    }

    return deserializedResponse;
  }
};