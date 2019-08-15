const _isNil = require('lodash/isNil')
const _assign = require('lodash/assign')

module.exports = {
  name: 'add-bearer-token',
  req: payload => {
    if (!_isNil(payload.jsonApi.bearer)) {
      payload.req.headers = _assign({}, payload.req.headers, {'Authorization': 'Bearer ' + payload.jsonApi.bearer})
    }
    return payload
  }
}
