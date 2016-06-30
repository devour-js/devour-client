'use strict';

var Qs = require('qs');

module.exports = {
  name: 'rails-params-serializer',
  req: function req(payload) {
    if (payload.req.method === 'GET') {
      payload.req.paramsSerializer = function (params) {
        return Qs.stringify(params, {
          arrayFormat: 'brackets',
          encode: false
        });
      };
    }

    return payload;
  }
};