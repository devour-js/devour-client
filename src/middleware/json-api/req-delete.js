module.exports = {
  name: 'DELETE',
  req: (payload) => {
    if (payload.req.method === 'DELETE') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }

      const data = payload.req.data
      if (typeof data === 'object' && Object.keys(data).length === 0) {
        delete payload.req.data
      }
    }

    return payload
  }
}
