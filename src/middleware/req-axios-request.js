module.exports = {
  name: 'AXIOS_REQUEST',
  req: function (payload) {
    let jsonApi = payload.jsonApi
    return jsonApi.axios(payload.req)
  }
}
