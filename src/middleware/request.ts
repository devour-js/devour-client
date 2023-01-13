import axios from 'axios';
import { Middleware } from './interfaces/middleware';
import { Payload } from './interfaces/payload';

class AxiosRequestMiddleware implements Middleware {
  name: 'axios-request';

  req(payload: Payload): Promise<Payload> {
    return axios(payload.req);
  }
}

export const sendRequestMiddleware = new AxiosRequestMiddleware();
