'use strict';

var isEmpty = require('lodash').isEmpty;
var assign = require('lodash').assign;

module.exports = {
  name: 'HEADER',
  req: function req(payload) {
    if (!isEmpty(payload.jsonApi.headers)) {
      payload.req.headers = assign({}, payload.req.headers, payload.jsonApi.headers);
    }
    return payload;
  }
};