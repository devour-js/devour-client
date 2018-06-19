const _isEmpty = require('lodash/isEmpty')

module.exports = {
  name: 'HTTP_BASIC_AUTH',
  req: (payload) => {
    if (!_isEmpty(payload.jsonApi.auth)) {
      payload.req.auth = payload.jsonApi.auth
    }
    return payload
  }
}
