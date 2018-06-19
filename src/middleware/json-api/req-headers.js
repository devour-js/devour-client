const _isEmpty = require('lodash/isEmpty')
const _assign = require('lodash/assign')

module.exports = {
  name: 'HEADER',
  req: (payload) => {
    if (!_isEmpty(payload.jsonApi.headers)) {
      payload.req.headers = _assign({}, payload.req.headers, payload.jsonApi.headers)
    }
    return payload
  }
}
