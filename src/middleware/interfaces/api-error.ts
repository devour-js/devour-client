interface Error {
  [key: string]: any;
}

interface ErrorResponse {
  errors: PropertyError[];
  status: number;
  type: string;
}

export class PropertyError implements Error {
  [key: string]: any;

  constructor(error: any) {
    Object.assign(this, error);
  }
}

export class ApiErrorResponse implements ErrorResponse {
  errors: PropertyError[];
  status: number;
  type: string;

  constructor(errors: PropertyError[], status: number = 0) {
    this.errors = errors;
    this.status = status;
    this.type = 'error';
  }
}
