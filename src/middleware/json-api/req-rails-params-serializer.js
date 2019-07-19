const Qs = require('qs')

module.exports = {
  name: 'RAILS_PARAMS_SERIALIZER',
  req: (payload) => {
    if (payload.req.method === 'GET') {
      payload.req.paramsSerializer = function (params) {
        return Qs.stringify(params, {
          arrayFormat: 'brackets',
          encodeValuesOnly: true
        })
      }
    }

    return payload
  }
}
