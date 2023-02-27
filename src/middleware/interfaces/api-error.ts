interface Error {
  [key: string]: any;
}

export class ApiError implements Error {
  [key: string]: any;
  constructor(error: any) {
    Object.assign(this, error);
    this.type = 'error';
  }
}
