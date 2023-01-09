import { assign, isNil } from 'lodash';

export default {
  name: 'add-bearer-token',
  req: (payload) => {
    if (!isNil(payload.jsonApi.bearer)) {
      payload.req.headers = assign({}, payload.req.headers, {
        Authorization: 'Bearer ' + payload.jsonApi.bearer
      });
    }
    return payload;
  }
};
