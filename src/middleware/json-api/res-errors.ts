import { Logger } from '../../logger';
import { ApiError } from '../interfaces/api-error';
import { Middleware } from '../interfaces/middleware';

function defaultErrorBuilder(error: ApiError): ApiError {
  const { title, detail } = error;
  return new ApiError({ title, detail });
}

function axiosErrorBuilder(error): ApiError {
  const { name, message, method, code, status } = error;
  return new ApiError({
    title: name,
    detail: message,
    status: status,
    code: code,
    method: method
  });
}

function getBuildErrors(options: { [key: string]: any }): Function {
  return function buildErrors(serverErrors): ApiError | ApiError[] {
    console.log('buildErrors(serverErrors): ApiError | ApiError[]');
    const errors: ApiError[] = [];
    const undefinedErrorIndex = 'unidentified';
    const undefinedErrorTitle = 'Unidentified error';
    const undefinedError = new ApiError({ title: undefinedErrorTitle });
    if (!serverErrors) {
      Logger.error(undefinedErrorTitle);
      errors[undefinedErrorIndex] = defaultErrorBuilder(undefinedError);
      return errors;
    }
    if (serverErrors.errors) {
      const errorBuilder =
        (options && options.errorBuilder) || defaultErrorBuilder;
      for (const [index, error] of serverErrors.errors.entries()) {
        errors[errorKey(index, error.source)] = errorBuilder(error);
      }
      return errors;
    }
    if (serverErrors.error) {
      errors[undefinedErrorIndex] = new ApiError({
        title: serverErrors.error
      });
      return errors;
    }
    errors[undefinedErrorIndex] = defaultErrorBuilder(undefinedError);
    return errors;
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
      if (res.response) {
        const response = res.response;
        if (response.data) {
          if (typeof response.data === 'string') {
            const error = response.statusText
              ? `${response.statusText}: ${response.data}`
              : response.data;
            return buildErrors({ error: error });
          }
          return buildErrors(response.data);
        }
        return buildErrors({ error: response.statusText });
      }
      if (res instanceof Error) {
        return [axiosErrorBuilder(res), res];
      }
      return null;
    }
  };
}
