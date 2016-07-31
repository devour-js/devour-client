'use strict';

module.exports = {
  name: 'axios-request',
  req: function req(payload) {
    var jsonApi = payload.jsonApi;
    return jsonApi.axios(payload.req);
  }
};