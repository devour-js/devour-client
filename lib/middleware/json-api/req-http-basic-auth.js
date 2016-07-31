'use strict';

var isEmpty = require('lodash').isEmpty;

module.exports = {
  name: 'HTTP_BASIC_AUTH',
  req: function req(payload) {
    if (!isEmpty(payload.jsonApi.auth)) {
      payload.req.auth = payload.jsonApi.auth;
    }
    return payload;
  }
};