import { ApiError } from './api-error';

export interface ApiResponse {
  data: any;
  errors: ApiError[];
  meta: any;
  links: any;
  document: any;
}
