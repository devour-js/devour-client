const Logger = require('../../logger')

function buildErrors (serverErrors) {
  if (!serverErrors) {
    Logger.error('Unidentified error')
    return
  } else {
    let errors = {}
    serverErrors.errors.forEach((error) => {
      errors[errorKey(error.source)] = error.title
    })
    return errors
  }
}

function errorKey (source) {
  return source.pointer.split('/').pop()
}

module.exports = {
  name: 'errors',
  error: function (payload) {
    return buildErrors(payload.response.data)
  }
}
