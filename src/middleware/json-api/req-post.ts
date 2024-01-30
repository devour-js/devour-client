import * as serialize from './_serialize';
import { Middleware } from '../interfaces/middleware';
import { Payload } from '../interfaces/payload';

class PostMiddleware implements Middleware {
  name: 'POST';

  req(payload: Payload): Payload {
    const jsonApi = payload.jsonApi;

    if (payload.req.method === 'POST') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json'
      };
      if (payload.req.data.constructor === Array) {
        payload.req.data = {
          data: serialize.collection.call(
            jsonApi,
            payload.req.model,
            payload.req.data
          ),
          meta: payload.req.meta
        };
      } else {
        payload.req.data = {
          data: serialize.resource.call(
            jsonApi,
            payload.req.model,
            payload.req.data
          ),
          meta: payload.req.meta
        };
      }
    }
    return payload;
  }
}

export const jsonApiPostMiddleware = new PostMiddleware();
