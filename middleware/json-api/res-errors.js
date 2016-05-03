function buildErrors(serverErrors) {
  if(!serverErrors) {
    console.log('Unidentified error')
    return
  }else{
    let errors = {}
    serverErrors.errors.forEach((error)=> {
      errors[errorKey(error.source)] = error.title
    })
    return errors
  }
}

function errorKey(source) {
  return source.pointer.split('/').pop()
}

export default {
  name: 'errors',
  error: function(payload) {
    return buildErrors(payload.data)
  }
}
