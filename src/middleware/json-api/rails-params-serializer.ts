import { stringify } from 'qs';
import { Payload } from '../interfaces/payload';
import { Middleware } from '../interfaces/middleware';

class RailsParamsSerializer implements Middleware {
  name: string = 'rails-params-serializer';

  req(payload: Payload): Payload {
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
}

export const railsParamsSerializer = new RailsParamsSerializer();
