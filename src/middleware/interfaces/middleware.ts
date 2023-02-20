import { Payload } from './payload';

export interface Middleware {
  name: string;
  req?: (p: Payload) => Payload | Promise<Payload>;
  res?: (p: Payload) => Payload | Promise<Payload>;
}
