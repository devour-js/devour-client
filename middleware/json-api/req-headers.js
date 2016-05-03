import {isEmpty} from 'lodash'
export default {
  name: 'HEADER',
  req: (payload)=> {
    if (!isEmpty(payload.jsonApi.headers)) {
      payload.req.headers = Object.assign({}, payload.req.headers, payload.jsonApi.headers)
    }
    return payload
  }
}