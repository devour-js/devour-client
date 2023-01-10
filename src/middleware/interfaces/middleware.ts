import { Payload } from './payload';
import { ApiResponse } from './api-response';

export interface Middleware {
  name: string;
  req?: (p: Payload) => Payload;
  res?: (p: Payload) => ApiResponse;
}
