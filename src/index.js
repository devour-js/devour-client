const axios = require('axios')
const pluralize = require('pluralize')
// Import only what we use from lodash.
const _isUndefined = require('lodash/isUndefined')
const _isNil = require('lodash/isNil')
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
const bearerTokenMiddleware = require('./middleware/json-api/req-bearer')
const sendRequestMiddleware = require('./middleware/request')
const deserializeResponseMiddleware = require('./middleware/json-api/res-deserialize')
const errorsMiddleware = require('./middleware/json-api/res-errors')

class JsonApi {
  constructor (options = {}) {
    if (!(arguments.length === 2 && _isString(arguments[0]) && _isArray(arguments[1])) && !(arguments.length === 1 && (_isPlainObject(arguments[0]) || _isString(arguments[0])))) {
      throw new Error('Invalid argument, initialize Devour with an object.')
    }

    const processErrors = errorsMiddleware.getMiddleware(options)

    const jsonApiMiddleware = [
      jsonApiHttpBasicAuthMiddleware,
      jsonApiPostMiddleware,
      jsonApiPatchMiddleware,
      jsonApiDeleteMiddleware,
      jsonApiGetMiddleware,
      jsonApiHeadersMiddleware,
      bearerTokenMiddleware,
      railsParamsSerializer,
      sendRequestMiddleware,
      processErrors,
      deserializeResponseMiddleware
    ]
    const defaults = {
      middleware: jsonApiMiddleware,
      logger: true,
      resetBuilderOnCall: true,
      auth: {},
      bearer: null,
      trailingSlash: { collection: false, resource: false },
      disableErrorsForMissingResourceDefinitions: false,
      attachRelationshipDataOnUnresolvedIncludes: true
    }

    const deprecatedConstructors = (args) => {
      return (args.length === 2 || (args.length === 1 && _isString(args[0])))
    }

    if (deprecatedConstructors(arguments)) {
      defaults.apiUrl = arguments[0]
      if (arguments.length === 2) {
        defaults.middleware = arguments[1]
      }
    }

    options = _defaultsDeep(options, defaults)
    const middleware = options.middleware

    this._originalMiddleware = middleware.slice(0)
    this.middleware = middleware.slice(0)
    this.headers = {}
    this.axios = axios
    this.auth = options.auth
    this.apiUrl = options.apiUrl
    this.bearer = options.bearer
    this.disableErrorsForMissingResourceDefinitions = options.disableErrorsForMissingResourceDefinitions
    this.attachRelationshipDataOnUnresolvedIncludes = options.attachRelationshipDataOnUnresolvedIncludes
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
    this.builderStack.push({ model: model, id: id, path: this.resourcePathFor(model, id) })
    return this
  }

  all (model) {
    this.builderStack.push({ model: model, path: this.collectionPathFor(model) })
    return this
  }

  relationships (relationshipName) {
    const lastRequest = _last(this.builderStack)
    this.builderStack.push({ path: 'relationships' })
    if (!relationshipName) return this

    const modelName = _get(lastRequest, 'model')
    if (!modelName) {
      throw new Error('Relationships must be called with a preceeding model.')
    }

    const relationship = this.relationshipFor(modelName, relationshipName)

    this.builderStack.push({ path: relationshipName, model: relationship.type })

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
    const path = this.buildPath()
    const slash = path !== '' && this.addSlash() ? '/' : ''
    return `${this.apiUrl}/${path}${slash}`
  }

  get (params = {}) {
    const lastRequest = _last(this.builderStack)

    const req = {
      method: 'GET',
      url: this.urlFor(),
      model: _get(lastRequest, 'model'),
      data: {},
      params
    }

    if (this.resetBuilderOnCall) {
      this.resetBuilder()
    }

    return this.runMiddleware(req)
  }

  post (payload, params = {}, meta = {}) {
    const lastRequest = _last(this.builderStack)

    const req = {
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
    const lastRequest = _last(this.builderStack)

    const req = {
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

    if (arguments.length >= 2) { // destroy (modelName, id, [payload], [meta])
      const [model, id, data, meta] = [...arguments]

      console.assert(model, 'No model specified')
      console.assert(id, 'No ID specified')
      req = {
        method: 'DELETE',
        url: this.urlFor({ model, id }),
        model: model,
        data: data || {},
        meta: meta || {}
      }
    } else { // destroy ([payload])
      // TODO: find a way to pass meta
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
    if (this.middlewareExists(newMiddleware.name)) {
      Logger.error('The middleware ' + newMiddleware.name + ' already exists')
      return
    }

    const middleware = this.middleware.filter(middleware => (middleware.name === middlewareName))
    if (middleware.length > 0) {
      let index = this.middleware.indexOf(middleware[0])
      if (direction === 'after') {
        index = index + 1
      }
      this.middleware.splice(index, 0, newMiddleware)
    }
  }

  replaceMiddleware (middlewareName, newMiddleware) {
    if (!this.middlewareExists(middlewareName)) {
      Logger.error('The middleware ' + middlewareName + ' does not exist')
      return
    }

    if (this.middlewareExists(newMiddleware.name)) {
      Logger.error('The middleware ' + newMiddleware.name + ' already exists')
      return
    }

    const index = _findIndex(this.middleware, ['name', middlewareName])
    this.middleware[index] = newMiddleware
  }

  removeMiddleware (middlewareName) {
    if (!this.middlewareExists(middlewareName)) {
      Logger.error('The middleware ' + middlewareName + ' does not exist')
      return
    }

    const index = _findIndex(this.middleware, ['name', middlewareName])
    this.middleware.splice(index, 1)
  }

  middlewareExists (middlewareName) {
    return this.middleware.some(middleware => (middleware.name === middlewareName))
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
    const requestMiddlewares = this.middleware.filter(middleware => middleware.req)
    requestMiddlewares.forEach((middleware) => {
      promise = promise.then(middleware.req)
    })
    return promise
  }

  applyResponseMiddleware (promise) {
    const responseMiddleware = this.middleware.filter(middleware => middleware.res)
    responseMiddleware.forEach((middleware) => {
      promise = promise.then(middleware.res)
    })
    return promise
  }

  applyErrorMiddleware (promise) {
    const errorsMiddleware = this.middleware.filter(middleware => middleware.error)
    errorsMiddleware.forEach((middleware) => {
      promise = promise.then(middleware.error)
    })
    return promise
  }

  runMiddleware (req) {
    const payload = { req: req, jsonApi: this }
    let requestPromise = Promise.resolve(payload)
    requestPromise = this.applyRequestMiddleware(requestPromise)
    return requestPromise
      .then((res) => {
        payload.res = res
        const responsePromise = Promise.resolve(payload)
        return this.applyResponseMiddleware(responsePromise)
      })
      .catch((err) => {
        Logger.error(err)
        const errorPromise = Promise.resolve(err)
        return this.applyErrorMiddleware(errorPromise).then(err => {
          return Promise.reject(err)
        })
      })
  }

  request (url, method = 'GET', params = {}, data = {}) {
    const req = { url, method, params, data }
    return this.runMiddleware(req)
  }

  find (modelName, id, params = {}) {
    const req = {
      method: 'GET',
      url: this.urlFor({ model: modelName, id: id }),
      model: modelName,
      data: {},
      params: params
    }
    return this.runMiddleware(req)
  }

  findAll (modelName, params = {}) {
    const req = {
      method: 'GET',
      url: this.urlFor({ model: modelName }),
      model: modelName,
      params: params,
      data: {}
    }
    return this.runMiddleware(req)
  }

  create (modelName, payload, params = {}, meta = {}) {
    const req = {
      method: 'POST',
      url: this.urlFor({ model: modelName }),
      model: modelName,
      params: params,
      data: payload,
      meta: meta
    }
    return this.runMiddleware(req)
  }

  update (modelName, payload, params = {}, meta = {}) {
    const req = {
      method: 'PATCH',
      url: this.urlFor({ model: modelName, id: payload.id }),
      model: modelName,
      data: payload,
      params: params,
      meta: meta
    }
    return this.runMiddleware(req)
  }

  modelFor (modelName) {
    if (!this.models[modelName]) {
      if (!this.disableErrorsForMissingResourceDefinitions) {
        throw new Error(`API resource definition for model "${modelName}" not found. Available models: ${Object.keys(this.models)}`)
      }
      Logger.error(`API resource definition for model "${modelName}" not found. Available models: ${Object.keys(this.models)}`)
      return {
        attributes: {},
        options: {}
      }
    }
    return this.models[modelName]
  }

  relationshipFor (modelName, relationshipName) {
    const model = this.modelFor(modelName)
    const relationship = model.attributes[relationshipName]

    if (!relationship) {
      throw new Error(`API resource definition on model "${modelName}" for relationship "${relationshipName}" not found. Available attributes: ${Object.keys(model.attributes)}`)
    }

    return relationship
  }

  collectionPathFor (modelName) {
    const collectionPath = _get(this.models[modelName], 'options.collectionPath') || this.pluralize(modelName)
    return `${collectionPath}`
  }

  resourcePathFor (modelName, id) {
    if (_isNil(id)) {
      throw new Error(`No ID specified; id is '${id}'`)
    }
    const collectionPath = this.collectionPathFor(modelName)
    return `${collectionPath}/${encodeURIComponent(id)}`
  }

  collectionUrlFor (modelName) {
    const collectionPath = this.collectionPathFor(modelName)
    const trailingSlash = this.trailingSlash.collection ? '/' : ''
    return `${this.apiUrl}/${collectionPath}${trailingSlash}`
  }

  resourceUrlFor (modelName, id) {
    const resourcePath = this.resourcePathFor(modelName, id)
    const trailingSlash = this.trailingSlash.resource ? '/' : ''
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
