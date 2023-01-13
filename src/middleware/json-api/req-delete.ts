import { Middleware } from '../interfaces/middleware';
import { Payload } from '../interfaces/payload';

class DeleteMiddleware implements Middleware {
  name: 'DELETE';

  req(payload: Payload): Payload {
    if (payload.req.method === 'DELETE') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      };

      const data = payload.req.data;
      if (typeof data === 'object') {
        if (Object.keys(data).length === 0) {
          delete payload.req.data;
        } else {
          payload.req.data = { data };
        }
      }
    }

    return payload;
  }
}

export const jsonApiDeleteMiddleware = new DeleteMiddleware();
