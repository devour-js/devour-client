const axios = require('axios')
const pluralize = require('pluralize')
// Import only what we use from lodash.
const _isUndefined = require('lodash/isUndefined')
const _isString = require('lodash/isString')
const _isPlainObject = require('lodash/isPlainObject')
const _isArray = require('lodash/isArray')
const _defaultsDeep = require('lodash/defaultsDeep')
const _forOwn = require('lodash/forOwn')
const _clone = require('lodash/clone')
const _get = require('lodash/get')
const _set = require('lodash/set')
const _hasIn = require('lodash/hasIn')
const _last = require('lodash/last')
const _map = require('lodash/map')
const _findIndex = require('lodash/findIndex')

require('es6-promise').polyfill()
const deserialize = require('./middleware/json-api/_deserialize')
const serialize = require('./middleware/json-api/_serialize')
const Logger = require('./logger')

/*
 *   == JsonApiMiddleware
 *
 *   Here we construct the middleware stack that will handle building and making
 *   requests, as well as serializing and deserializing our payloads. Users can
 *   easily construct their own middleware layers that adhere to different
 *   standards.
 *
 */
const jsonApiHttpBasicAuthMiddleware = require('./middleware/json-api/req-http-basic-auth')
const jsonApiPostMiddleware = require('./middleware/json-api/req-post')
const jsonApiPatchMiddleware = require('./middleware/json-api/req-patch')
const jsonApiDeleteMiddleware = require('./middleware/json-api/req-delete')
const jsonApiGetMiddleware = require('./middleware/json-api/req-get')
const jsonApiHeadersMiddleware = require('./middleware/json-api/req-headers')
const railsParamsSerializer = require('./middleware/json-api/rails-params-serializer')
const sendRequestMiddleware = require('./middleware/request')
const deserializeResponseMiddleware = require('./middleware/json-api/res-deserialize')
const processErrors = require('./middleware/json-api/res-errors')

let jsonApiMiddleware = [
  jsonApiHttpBasicAuthMiddleware,
  jsonApiPostMiddleware,
  jsonApiPatchMiddleware,
  jsonApiDeleteMiddleware,
  jsonApiGetMiddleware,
  jsonApiHeadersMiddleware,
  railsParamsSerializer,
  sendRequestMiddleware,
  processErrors,
  deserializeResponseMiddleware
]

class JsonApi {

  constructor (options = {}) {
    if (!(arguments.length === 2 && _isString(arguments[0]) && _isArray(arguments[1])) && !(arguments.length === 1 && (_isPlainObject(arguments[0]) || _isString(arguments[0])))) {
      throw new Error('Invalid argument, initialize Devour with an object.')
    }

    let defaults = {
      middleware: jsonApiMiddleware,
      logger: true,
      resetBuilderOnCall: true,
      auth: {},
      trailingSlash: {collection: false, resource: false}
    }

    let deprecatedConstructors = (args) => {
      return (args.length === 2 || (args.length === 1 && _isString(args[0])))
    }

    if (deprecatedConstructors(arguments)) {
      defaults.apiUrl = arguments[0]
      if (arguments.length === 2) {
        defaults.middleware = arguments[1]
      }
    }

    options = _defaultsDeep(options, defaults)
    let middleware = options.middleware

    this._originalMiddleware = middleware.slice(0)
    this.middleware = middleware.slice(0)
    this.headers = {}
    this.axios = axios
    this.auth = options.auth
    this.apiUrl = options.apiUrl
    this.models = {}
    this.deserialize = deserialize
    this.serialize = serialize
    this.builderStack = []
    this.resetBuilderOnCall = !!options.resetBuilderOnCall
    if (options.pluralize === false) {
      this.pluralize = s => s
      this.pluralize.singular = s => s
    } else if ('pluralize' in options) {
      this.pluralize = options.pluralize
    } else {
      this.pluralize = pluralize
    }
    this.trailingSlash = options.trailingSlash === true ? _forOwn(_clone(defaults.trailingSlash), (v, k, o) => { _set(o, k, true) }) : options.trailingSlash
    options.logger ? Logger.enable() : Logger.disable()

    if (deprecatedConstructors(arguments)) {
      Logger.warn('Constructor (apiUrl, middleware) has been deprecated, initialize Devour with an object.')
    }
  }

  enableLogging (enabled = true) {
    enabled ? Logger.enable() : Logger.disable()
  }

  one (model, id) {
    this.builderStack.push({model: model, id: id, path: this.resourcePathFor(model, id)})
    return this
  }

  all (model) {
    this.builderStack.push({model: model, path: this.collectionPathFor(model)})
    return this
  }

  relationships () {
    this.builderStack.push({path: 'relationships'})
    return this
  }

  resetBuilder () {
    this.builderStack = []
  }

  stackForResource () {
    return _hasIn(_last(this.builderStack), 'id')
  }

  addSlash () {
    return this.stackForResource() ? this.trailingSlash.resource : this.trailingSlash.collection
  }

  buildPath () {
    return _map(this.builderStack, 'path').join('/')
  }

  buildUrl () {
    let path = this.buildPath()
    let slash = path !== '' && this.addSlash() ? '/' : ''
    return `${this.apiUrl}/${path}${slash}`
  }

  get (params = {}) {
    let req = {
      method: 'GET',
      url: this.urlFor(),
      data: {},
      params
    }

    if (this.resetBuilderOnCall) {
      this.resetBuilder()
    }

    return this.runMiddleware(req)
  }

  post (payload, params = {}, meta = {}) {
    let lastRequest = _last(this.builderStack)

    let req = {
      method: 'POST',
      url: this.urlFor(),
      model: _get(lastRequest, 'model'),
      data: payload,
      params,
      meta
    }

    if (this.resetBuilderOnCall) {
      this.resetBuilder()
    }

    return this.runMiddleware(req)
  }

  patch (payload, params = {}, meta = {}) {
    let lastRequest = _last(this.builderStack)

    let req = {
      method: 'PATCH',
      url: this.urlFor(),
      model: _get(lastRequest, 'model'),
      data: payload,
      params,
      meta
    }

    if (this.resetBuilderOnCall) {
      this.resetBuilder()
    }

    return this.runMiddleware(req)
  }

  destroy () {
    let req = null

    if (arguments.length === 2) {
      req = {
        method: 'DELETE',
        url: this.urlFor({model: arguments[0], id: arguments[1]}),
        model: arguments[0],
        data: {}
      }
    } else {
      const lastRequest = _last(this.builderStack)

      req = {
        method: 'DELETE',
        url: this.urlFor(),
        model: _get(lastRequest, 'model'),
        data: arguments.length === 1 ? arguments[0] : {}
      }

      if (this.resetBuilderOnCall) {
        this.resetBuilder()
      }
    }

    return this.runMiddleware(req)
  }

  insertMiddlewareBefore (middlewareName, newMiddleware) {
    this.insertMiddleware(middlewareName, 'before', newMiddleware)
  }

  insertMiddlewareAfter (middlewareName, newMiddleware) {
    this.insertMiddleware(middlewareName, 'after', newMiddleware)
  }

  insertMiddleware (middlewareName, direction, newMiddleware) {
    let middleware = this.middleware.filter(middleware => (middleware.name === middlewareName))
    if (middleware.length > 0) {
      let index = this.middleware.indexOf(middleware[0])
      if (direction === 'after') {
        index = index + 1
      }
      this.middleware.splice(index, 0, newMiddleware)
    }
  }

  replaceMiddleware (middlewareName, newMiddleware) {
    let index = _findIndex(this.middleware, ['name', middlewareName])
    this.middleware[index] = newMiddleware
  }

  define (modelName, attributes, options = {}) {
    this.models[modelName] = {
      attributes: attributes,
      options: options
    }
  }

  resetMiddleware () {
    this.middleware = this._originalMiddleware.slice(0)
  }

  applyRequestMiddleware (promise) {
    let requestMiddlewares = this.middleware.filter(middleware => middleware.req)
    requestMiddlewares.forEach((middleware) => {
      promise = promise.then(middleware.req)
    })
    return promise
  }

  applyResponseMiddleware (promise) {
    let responseMiddleware = this.middleware.filter(middleware => middleware.res)
    responseMiddleware.forEach((middleware) => {
      promise = promise.then(middleware.res)
    })
    return promise
  }

  applyErrorMiddleware (promise) {
    let errorsMiddleware = this.middleware.filter(middleware => middleware.error)
    errorsMiddleware.forEach((middleware) => {
      promise = promise.then(middleware.error)
    })
    return promise
  }

  runMiddleware (req) {
    let payload = {req: req, jsonApi: this}
    let requestPromise = Promise.resolve(payload)
    requestPromise = this.applyRequestMiddleware(requestPromise)
    return requestPromise
      .then((res) => {
        payload.res = res
        let responsePromise = Promise.resolve(payload)
        return this.applyResponseMiddleware(responsePromise)
      })
      .catch((err) => {
        Logger.error(err)
        let errorPromise = Promise.resolve(err)
        return this.applyErrorMiddleware(errorPromise).then(err => {
          return Promise.reject(err)
        })
      })
  }

  request (url, method = 'GET', params = {}, data = {}) {
    let req = { url, method, params, data }
    return this.runMiddleware(req)
  }

  find (modelName, id, params = {}) {
    let req = {
      method: 'GET',
      url: this.urlFor({model: modelName, id: id}),
      model: modelName,
      data: {},
      params: params
    }
    return this.runMiddleware(req)
  }

  findAll (modelName, params = {}) {
    let req = {
      method: 'GET',
      url: this.urlFor({model: modelName}),
      model: modelName,
      params: params,
      data: {}
    }
    return this.runMiddleware(req)
  }

  create (modelName, payload, params = {}, meta = {}) {
    let req = {
      method: 'POST',
      url: this.urlFor({model: modelName}),
      model: modelName,
      params: params,
      data: payload,
      meta: meta
    }
    return this.runMiddleware(req)
  }

  update (modelName, payload, params = {}, meta = {}) {
    let req = {
      method: 'PATCH',
      url: this.urlFor({model: modelName, id: payload.id}),
      model: modelName,
      data: payload,
      params: params,
      meta: meta
    }
    return this.runMiddleware(req)
  }

  modelFor (modelName) {
    if (!this.models[modelName]) {
      throw new Error(`API resource definition for model "${modelName}" not found.`)
    }

    return this.models[modelName]
  }

  collectionPathFor (modelName) {
    let collectionPath = _get(this.models[modelName], 'options.collectionPath') || this.pluralize(modelName)
    return `${collectionPath}`
  }

  resourcePathFor (modelName, id) {
    let collectionPath = this.collectionPathFor(modelName)
    return `${collectionPath}/${encodeURIComponent(id)}`
  }

  collectionUrlFor (modelName) {
    let collectionPath = this.collectionPathFor(modelName)
    let trailingSlash = this.trailingSlash['collection'] ? '/' : ''
    return `${this.apiUrl}/${collectionPath}${trailingSlash}`
  }

  resourceUrlFor (modelName, id) {
    let resourcePath = this.resourcePathFor(modelName, id)
    let trailingSlash = this.trailingSlash['resource'] ? '/' : ''
    return `${this.apiUrl}/${resourcePath}${trailingSlash}`
  }

  urlFor (options = {}) {
    if (!_isUndefined(options.model) && !_isUndefined(options.id)) {
      return this.resourceUrlFor(options.model, options.id)
    } else if (!_isUndefined(options.model)) {
      return this.collectionUrlFor(options.model)
    } else {
      return this.buildUrl()
    }
  }

  pathFor (options = {}) {
    if (!_isUndefined(options.model) && !_isUndefined(options.id)) {
      return this.resourcePathFor(options.model, options.id)
    } else if (!_isUndefined(options.model)) {
      return this.collectionPathFor(options.model)
    } else {
      return this.buildPath()
    }
  }
}

module.exports = JsonApi
