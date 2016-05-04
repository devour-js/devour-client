module.exports = {
  name: 'DELETE',
  req: (payload)=> {
    if(payload.req.method === 'DELETE') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
      payload.req.data = {}
    }

    return payload
  }
}
