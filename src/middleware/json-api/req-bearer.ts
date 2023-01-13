import { assign, isNil } from 'lodash';
import { Middleware } from '../interfaces/middleware';
import { Payload } from '../interfaces/payload';

class BearerTokenMiddleware implements Middleware {
  public name: string = 'add-bearer-token';

  public req(payload: Payload): Payload {
    if (!isNil(payload.jsonApi.bearer)) {
      payload.req.headers = assign({}, payload.req.headers, {
        Authorization: 'Bearer ' + payload.jsonApi.bearer
      });
    }
    return payload;
  }
}

export const bearerTokenMiddleware = new BearerTokenMiddleware();
