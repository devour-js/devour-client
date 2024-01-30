import Axios, { AxiosObservable } from 'axios-observable';
import { Middleware } from './interfaces/middleware';
import { Payload } from './interfaces/payload';

class AxiosRequestMiddleware implements Middleware {
  name: 'axios-request';

  req(payload: Payload): AxiosObservable<Payload> {
    return Axios.request(payload.req);
  }
}

export const sendRequestMiddleware = new AxiosRequestMiddleware();
