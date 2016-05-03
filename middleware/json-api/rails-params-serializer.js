import Qs from 'qs'

export default {
  name: 'rails-params-serializer',
  req: (payload)=> {
    if(payload.req.method === 'GET') {
      payload.req.paramsSerializer = function(params) {
        return Qs.stringify(params, {arrayFormat: 'brackets'})
      }
    }

    return payload
  }
}
