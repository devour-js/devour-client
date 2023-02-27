import { Logger } from '../../logger';
import { Middleware } from '../interfaces/middleware';
import { ApiErrorResponse, PropertyError } from '../interfaces/api-error';

function defaultErrorBuilder(error: PropertyError): PropertyError {
  const { title, detail, meta, code } = error;
  return new PropertyError({ title, detail, meta, code });
}

function axiosErrorBuilder(error): PropertyError {
  const { name, message, method, code, status } = error;
  return new PropertyError({
    title: name,
    detail: message,
    status: status,
    code: code,
    method: method
  });
}

function getBuildErrors(options: { [key: string]: any }): Function {
  return function buildErrors(
    serverErrors,
    httpStatus: number
  ): ApiErrorResponse {
    const errors: PropertyError[] = [];
    const undefinedErrorIndex = 'unidentified';
    const undefinedErrorTitle = 'Unidentified error';
    const undefinedError = new PropertyError({ title: undefinedErrorTitle });
    if (!serverErrors) {
      Logger.error(undefinedErrorTitle);
      errors[undefinedErrorIndex] = defaultErrorBuilder(undefinedError);
    } else if (serverErrors.errors) {
      const errorBuilder =
        (options && options.errorBuilder) || defaultErrorBuilder;
      for (const [index, error] of serverErrors.errors.entries()) {
        errors[errorKey(index, error.source)] = errorBuilder(error);
      }
    } else if (serverErrors.error) {
      errors[undefinedErrorIndex] = new PropertyError({
        title: serverErrors.error
      });
    } else {
      errors[undefinedErrorIndex] = defaultErrorBuilder(undefinedError);
    }
    return new ApiErrorResponse(errors, httpStatus);
  };
}

function errorKey(index, source) {
  if (!source || source.pointer == null) {
    return index;
  }
  return source.pointer.split('/').pop();
}

export function getMiddleware(options: { [key: string]: any }): Middleware {
  const buildErrors = getBuildErrors(options);
  return {
    name: 'errors',
    error: function (res: any) {
      const httpStatus: number = res.response?.status;
      if (res.response) {
        const response = res.response;
        if (response.data) {
          if (typeof response.data === 'string') {
            const error = response.statusText
              ? `${response.statusText}: ${response.data}`
              : response.data;
            return buildErrors({ error: error }, httpStatus);
          }
          return buildErrors(response.data, httpStatus);
        }
        return buildErrors({ error: response.statusText }, httpStatus);
      }
      if (res instanceof Error) {
        const error: PropertyError = axiosErrorBuilder(res);
        return new ApiErrorResponse([error], httpStatus);
      }
      return null;
    }
  };
}
