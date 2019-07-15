const Logger = require('../../logger')

function defaultErrorBuilder (error) {
  const { title, detail } = error
  return { title, detail }
}

function getBuildErrors (options) {
  return function buildErrors (serverErrors) {
    if (!serverErrors) {
      Logger.error('Unidentified error')
      return
    }
    const errorBuilder = (options && options.errorBuilder) || defaultErrorBuilder
    const errors = {}
    if (serverErrors.errors) {
      for (let [index, error] of serverErrors.errors.entries()) {
        errors[errorKey(index, error.source)] = errorBuilder(error)
      }
    }
    if (serverErrors.error) {
      errors['data'] = {title: serverErrors.error}
    }
    return errors
  }
}

function errorKey (index, source) {
  if (!source || source.pointer == null) {
    return index
  }
  return source.pointer.split('/').pop()
}

exports.getMiddleware = function (options) {
  const buildErrors = getBuildErrors(options)
  return {
    name: 'errors',
    error: function (payload) {
      if (payload.response) {
        const response = payload.response
        if (response.data) {
          if (typeof response.data === 'string') {
            const error = response.statusText ? `${response.statusText}: ${response.data}` : response.data
            return buildErrors({error})
          }
          return buildErrors(response.data)
        }
        return buildErrors({error: response.statusText})
      }
      if (payload instanceof Error) {
        return payload
      }
      return null
    }
  }
}
