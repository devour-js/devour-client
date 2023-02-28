import { ApiErrorResponse } from './api-error';

interface Response {
  data: any;
  errors: ApiErrorResponse;
  meta: any;
  links: any;
  document: any;
}

export class ApiResponse implements Response {
  data: any;
  errors: ApiErrorResponse;
  meta: any;
  links: any;
  document: any;

  constructor(error: any) {
    Object.assign(this, error);
  }
}
