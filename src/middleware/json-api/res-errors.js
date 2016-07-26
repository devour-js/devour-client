function buildErrors (serverErrors) {
  if (!serverErrors) {
    console.log('Unidentified error')
    return
  } else {
    let errors = {}
    serverErrors.errors.forEach((error) => {
      if (error.source && error.title) {
        errors[errorKey(error.source)] = error.title
      } else if (error.title && error.detail) {
        errors[error.title] = error.detail
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
