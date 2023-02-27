import { PropertyError } from './api-error';

interface Response {
  data: any;
  errors: PropertyError[];
  meta: any;
  links: any;
  document: any;
}

export class ApiResponse implements Response {
  data: any;
  errors: PropertyError[];
  meta: any;
  links: any;
  document: any;

  constructor(error: any) {
    Object.assign(this, error);
  }
}
