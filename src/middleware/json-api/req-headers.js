const isEmpty = require('lodash').isEmpty
const assign = require('lodash').assign

module.exports = {
  name: 'HEADER',
  req: (payload) => {
    if (!isEmpty(payload.jsonApi.headers)) {
      payload.req.headers = assign({}, payload.req.headers, payload.jsonApi.headers)
    }
    return payload
  }
}
