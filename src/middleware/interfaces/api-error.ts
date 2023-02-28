interface ErrorResponse {
  errors: { [key: string]: object };
  status: number;
  type: string;
}

export class ApiErrorResponse implements ErrorResponse {
  errors: { [key: string]: object };
  status: number;
  type: string;

  constructor(errors: { [key: string]: object }, status: number = 0) {
    this.errors = errors;
    this.status = status;
    this.type = 'error';
  }
}
