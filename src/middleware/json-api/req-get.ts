import { Middleware } from '../interfaces/middleware';
import { Payload } from '../interfaces/payload';

class GetMiddleware implements Middleware {
  name: 'GET';

  req(payload: Payload): Payload {
    if (payload.req.method === 'GET') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      };
      delete payload.req.data;
    }

    return payload;
  }
}

export const jsonApiGetMiddleware = new GetMiddleware();
