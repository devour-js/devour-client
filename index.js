const axios = require('axios')
const pluralize = require('pluralize')
const _ = require('lodash')
const Promise = require('es6-promise').Promise
const deserialize = require('./middleware/json-api/_deserialize')
const serialize = require('./middleware/json-api/_serialize')

/*
*   == JsonApiMiddleware
*
*   Here we construct the middleware stack that will handle building and making
*   requests, as well as serializing and deserializing our payloads. Users can
*   easily construct their own middleware layers that adhere to different
*   standards.
*
*/
const jsonApiPostMiddleware = require('./middleware/json-api/req-post')
const jsonApiPatchMiddleware = require('./middleware/json-api/req-patch')
const jsonApiDeleteMiddleware = require('./middleware/json-api/req-delete')
const jsonApiHeadersMiddleware = require('./middleware/json-api/req-headers')
const railsParamsSerializer = require('./middleware/json-api/rails-params-serializer')
const sendRequestMiddleware = require('./middleware/request')
const deserializeResponseMiddleware = require('./middleware/json-api/res-deserialize')
const processErrors = require('./middleware/json-api/res-errors')

let jsonApiMiddleware = [
  jsonApiPostMiddleware,
  jsonApiPatchMiddleware,
  jsonApiDeleteMiddleware,
  jsonApiHeadersMiddleware,
  railsParamsSerializer,
  sendRequestMiddleware,
  processErrors,
  deserializeResponseMiddleware
]


class JsonApi {

  constructor (options = {}) {
    if (!(arguments.length == 2 && _.isString(arguments[0]) && _.isArray(arguments[1])) && !(arguments.length === 1 && (_.isPlainObject(arguments[0]) || _.isString(arguments[0])))) {
      throw new Error("Invalid argument, initialize Devour with an object.")
    }

    let defaults = {
      middleware: jsonApiMiddleware
    }

    if (arguments.length === 2 || (arguments.length === 1 && _.isString(arguments[0]))) {
      defaults.apiUrl = arguments[0]
      if (arguments.length === 2) {
        defaults.middleware = arguments[1]
      }
      console.error('Constructor (apiUrl, middleware) has been deprecated, initialize Devour with an object.')
    }

    options = _.assign(defaults, options)
    let middleware = options.middleware

    this._originalMiddleware = options.middleware.slice(0)
    this.middleware = options.middleware.slice(0)
    this.headers = {}
    this.axios = axios
    this.apiUrl = options.apiUrl
    this.models = {}
    this.deserialize = deserialize
    this.serialize = serialize
  }

  insertMiddlewareBefore(middlewareName, newMiddleware) {
    this.insertMiddleware(middlewareName, 'before', newMiddleware)
  }

  insertMiddlewareAfter(middlewareName, newMiddleware) {
    this.insertMiddleware(middlewareName, 'after', newMiddleware)
  }

  insertMiddleware(middlewareName, direction, newMiddleware) {
    let middleware = this.middleware.filter(middleware => (middleware.name === middlewareName))
    if(middleware.length > 0) {
      let index = this.middleware.indexOf(middleware[0])
      if(direction === 'after') {
        index = index + 1
      }
      this.middleware.splice(index, 0, newMiddleware)
    }
  }

  define(modelName, attributes, options = {}) {
    this.models[modelName] = {
      attributes: attributes,
      options: options
    }
  }

  resetMiddleware() {
    this.middleware = this._originalMiddleware.slice(0)
  }

  applyRequestMiddleware(promise) {
    let requestMiddlewares = this.middleware.filter(middleware => middleware.req)
    requestMiddlewares.forEach((middleware) => {
      promise = promise.then(middleware.req)
    })
    return promise
  }

  applyResponseMiddleware(promise) {
    let responseMiddleware = this.middleware.filter(middleware => middleware.res)
    responseMiddleware.forEach((middleware) => {
      promise = promise.then(middleware.res)
    })
    return promise
  }

  applyErrorMiddleware(promise) {
    let errorsMiddleware = this.middleware.filter(middleware => middleware.error)
    errorsMiddleware.forEach((middleware) => {
      promise = promise.then(middleware.error)
    })
    return promise
  }

  runMiddleware(req) {
    let payload = {req: req, jsonApi: this}
    let requestPromise = Promise.resolve(payload)
    requestPromise = this.applyRequestMiddleware(requestPromise)
    return requestPromise.then(
      (res)=> {
        payload.res = res
        let responsePromise = Promise.resolve(payload)
        return this.applyResponseMiddleware(responsePromise)
      }).catch((err) => {
        console.error(err)
        let errorPromise = Promise.resolve(err)
        return this.applyErrorMiddleware(errorPromise).then(err => {
          return Promise.reject(err)
        })
      })
  }

  find(modelName, id, params={}) {
    let req = {
      method: 'GET',
      url: this.resourceUrlFor(modelName, id),
      model: modelName,
      data: {},
      params: params
    }
    return this.runMiddleware(req)
  }

  findAll(modelName, params={}) {
    let req = {
      method: 'GET',
      url: this.collectionUrlFor(modelName),
      model: modelName,
      params: params,
      data: {}
    }
    return this.runMiddleware(req)
  }

  create(modelName, payload) {
    let req = {
      method: 'POST',
      url: this.collectionUrlFor(modelName),
      model: modelName,
      data: payload
    }
    return this.runMiddleware(req)
  }

  update(modelName, payload) {
    let req = {
      method: 'PATCH',
      url: this.resourceUrlFor(modelName, payload.id),
      model: modelName,
      data: payload
    }
    return this.runMiddleware(req)
  }

  destroy(modelName, id) {
    let req = {
      method: 'DELETE',
      url: this.resourceUrlFor(modelName, id),
      model: modelName,
      data: {}
    }
    return this.runMiddleware(req)
  }

  modelFor(modelName) {
    return this.models[modelName]
  }

  collectionPathFor(modelName) {
    let collectionPath = this.models[modelName].options.collectionPath || pluralize(modelName)
    return `${collectionPath}`
  }

  resourcePathFor(modelName, id) {
    let collectionPath = this.collectionPathFor(modelName)
    return `${collectionPath}/${id}`
  }

  collectionUrlFor(modelName) {
    let collectionPath = this.collectionPathFor(modelName)
    return `${this.apiUrl}/${collectionPath}`
  }

  resourceUrlFor(modelName, id) {
    let resourcePath = this.resourcePathFor(modelName, id)
    return `${this.apiUrl}/${resourcePath}`
  }

}

module.exports = JsonApi
