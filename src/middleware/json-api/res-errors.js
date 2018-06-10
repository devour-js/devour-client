const Logger = require('../../logger')

function buildErrors (serverErrors) {
  if (!serverErrors) {
    Logger.error('Unidentified error')
    return
  } else {
    let errors = {}
    if (serverErrors.errors) {
      for (let [index, error] of serverErrors.errors.entries()) {
        errors[errorKey(index, error.source)] = {title: error.title, detail: error.detail}
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

module.exports = {
  name: 'errors',
  error: function (payload) {
    if (payload.response) {
      if (payload.response.data) {
        return buildErrors(payload.response.data)
      }
      return buildErrors({error: payload.response.statusText})
    }
    if (payload instanceof Error) {
      return payload
    }
    return null
  }
}
