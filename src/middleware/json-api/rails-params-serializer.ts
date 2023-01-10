import { stringify } from 'qs';

export default {
  name: 'rails-params-serializer',
  req: (payload) => {
    if (payload.req.method === 'GET') {
      payload.req.paramsSerializer = {
        serialize: function (params) {
          return stringify(params, {
            arrayFormat: 'brackets',
            encodeValuesOnly: true
          });
        }
      };
    }

    return payload;
  }
};
