module.exports = {
  name: 'DELETE',
  req: (payload) => {
    if (payload.req.method === 'DELETE') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      }

      const data = payload.req.data
      if (typeof data === 'object') {
        if (Object.keys(data).length === 0) {
          delete payload.req.data
        } else {
          payload.req.data = { data }
        }
      }
    }

    return payload
  }
}
