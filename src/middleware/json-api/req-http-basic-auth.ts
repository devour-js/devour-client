import { isEmpty } from 'lodash';
import { Middleware } from '../interfaces/middleware';
import { Payload } from '../interfaces/payload';

class HttpBasicAuthMiddleware implements Middleware {
  name: 'HTTP_BASIC_AUTH';

  req(payload: Payload): Payload {
    if (!isEmpty(payload.jsonApi.auth)) {
      payload.req.auth = payload.jsonApi.auth;
    }
    return payload;
  }
}

export const jsonApiHttpBasicAuthMiddleware = new HttpBasicAuthMiddleware();
