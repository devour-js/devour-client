module.exports = {
  name: 'axios-request',
  req: function (payload) {
    const jsonApi = payload.jsonApi
    return jsonApi.axios(payload.req)
  }
}
