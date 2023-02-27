import { Payload } from './payload';
import { ApiResponse } from './api-response';
import { AxiosObservable } from 'axios-observable';
import { PropertyError } from './api-error';

export interface Middleware {
  name: string;
  req?: (p: Payload) => Payload | AxiosObservable<Payload>;
  res?: (p: Payload) => ApiResponse;
  error?: (p: Payload) => PropertyError[];
}
