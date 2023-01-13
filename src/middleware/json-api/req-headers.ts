import { assign, isEmpty } from 'lodash';
import { Middleware } from '../interfaces/middleware';
import { Payload } from '../interfaces/payload';

class HeaderMiddleware implements Middleware {
  name: 'HEADER';

  req(payload: Payload): Payload {
    if (!isEmpty(payload.jsonApi.headers)) {
      payload.req.headers = assign(
        {},
        payload.req.headers,
        payload.jsonApi.headers
      );
    }
    return payload;
  }
}

export const jsonApiHeadersMiddleware = new HeaderMiddleware();
