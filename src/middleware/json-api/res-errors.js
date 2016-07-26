const _ = require('lodash')

function buildErrors (serverErrors) {
  if (!serverErrors) {
    console.log('Unidentified error')
    return
  } else {
    let errors = {}
    _.forEach(serverErrors.errors, (error) => {
      if (error.source) {
        errors[errorKey(error.source)] = error.title
      }
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
    return buildErrors(payload.data)
  }
}
