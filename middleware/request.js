const Promise = require('es6-promise').Promise

module.exports = {
  name: 'axios-request',
  req: function(payload) {
    let jsonApi = payload.jsonApi
    return jsonApi.axios(payload.req)
  }
}
