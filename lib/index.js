'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var axios = require('axios');
var pluralize = require('pluralize');
var _ = require('lodash');
var Promise = require('es6-promise').Promise;
var deserialize = require('./middleware/json-api/_deserialize');
var serialize = require('./middleware/json-api/_serialize');
var Minilog = require('minilog');

/*
 *   == JsonApiMiddleware
 *
 *   Here we construct the middleware stack that will handle building and making
 *   requests, as well as serializing and deserializing our payloads. Users can
 *   easily construct their own middleware layers that adhere to different
 *   standards.
 *
 */
var jsonApiHttpBasicAuthMiddleware = require('./middleware/json-api/req-http-basic-auth');
var jsonApiPostMiddleware = require('./middleware/json-api/req-post');
var jsonApiPatchMiddleware = require('./middleware/json-api/req-patch');
var jsonApiDeleteMiddleware = require('./middleware/json-api/req-delete');
var jsonApiGetMiddleware = require('./middleware/json-api/req-get');
var jsonApiHeadersMiddleware = require('./middleware/json-api/req-headers');
var railsParamsSerializer = require('./middleware/json-api/rails-params-serializer');
var sendRequestMiddleware = require('./middleware/request');
var deserializeResponseMiddleware = require('./middleware/json-api/res-deserialize');
var processErrors = require('./middleware/json-api/res-errors');

var jsonApiMiddleware = [jsonApiHttpBasicAuthMiddleware, jsonApiPostMiddleware, jsonApiPatchMiddleware, jsonApiDeleteMiddleware, jsonApiGetMiddleware, jsonApiHeadersMiddleware, railsParamsSerializer, sendRequestMiddleware, processErrors, deserializeResponseMiddleware];

var JsonApi = function () {
  function JsonApi() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, JsonApi);

    if (!(arguments.length === 2 && _.isString(arguments[0]) && _.isArray(arguments[1])) && !(arguments.length === 1 && (_.isPlainObject(arguments[0]) || _.isString(arguments[0])))) {
      throw new Error('Invalid argument, initialize Devour with an object.');
    }

    var defaults = {
      middleware: jsonApiMiddleware,
      logger: true,
      resetBuilderOnCall: true,
      auth: {}
    };

    var deprecatedConstructos = function deprecatedConstructos(args) {
      return args.length === 2 || args.length === 1 && _.isString(args[0]);
    };

    if (deprecatedConstructos(arguments)) {
      defaults.apiUrl = arguments[0];
      if (arguments.length === 2) {
        defaults.middleware = arguments[1];
      }
    }

    options = _.assign(defaults, options);
    var middleware = options.middleware;

    this._originalMiddleware = middleware.slice(0);
    this.middleware = middleware.slice(0);
    this.headers = {};
    this.axios = axios;
    this.auth = options.auth;
    this.apiUrl = options.apiUrl;
    this.models = {};
    this.deserialize = deserialize;
    this.serialize = serialize;
    this.builderStack = [];
    this.resetBuilderOnCall = !!options.resetBuilderOnCall;
    this.logger = Minilog('devour');
    options.logger ? Minilog.enable() : Minilog.disable();

    if (deprecatedConstructos(arguments)) {
      this.logger.warn('Constructor (apiUrl, middleware) has been deprecated, initialize Devour with an object.');
    }
  }

  _createClass(JsonApi, [{
    key: 'enableLogging',
    value: function enableLogging() {
      var enabled = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      enabled ? Minilog.enable() : Minilog.disable();
    }
  }, {
    key: 'one',
    value: function one(model, id) {
      this.builderStack.push({ model: model, id: id, path: this.resourcePathFor(model, id) });
      return this;
    }
  }, {
    key: 'all',
    value: function all(model) {
      this.builderStack.push({ model: model, path: this.collectionPathFor(model) });
      return this;
    }
  }, {
    key: 'resetBuilder',
    value: function resetBuilder() {
      this.builderStack = [];
    }
  }, {
    key: 'buildPath',
    value: function buildPath() {
      return _.map(this.builderStack, 'path').join('/');
    }
  }, {
    key: 'buildUrl',
    value: function buildUrl() {
      return this.apiUrl + '/' + this.buildPath();
    }
  }, {
    key: 'get',
    value: function get() {
      var params = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var req = {
        method: 'GET',
        url: this.urlFor(),
        data: {},
        params: params
      };

      if (this.resetBuilderOnCall) {
        this.resetBuilder();
      }

      return this.runMiddleware(req);
    }
  }, {
    key: 'post',
    value: function post(payload) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var lastRequest = _.chain(this.builderStack).last();

      var req = {
        method: 'POST',
        url: this.urlFor(),
        model: lastRequest.get('model').value(),
        data: payload,
        params: params
      };

      if (this.resetBuilderOnCall) {
        this.resetBuilder();
      }

      return this.runMiddleware(req);
    }
  }, {
    key: 'patch',
    value: function patch(payload) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var lastRequest = _.chain(this.builderStack).last();

      var req = {
        method: 'PATCH',
        url: this.urlFor(),
        model: lastRequest.get('model').value(),
        data: payload,
        params: params
      };

      if (this.resetBuilderOnCall) {
        this.resetBuilder();
      }

      return this.runMiddleware(req);
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      if (arguments.length === 2) {
        var req = {
          method: 'DELETE',
          url: this.urlFor({ model: arguments[0], id: arguments[1] }),
          model: arguments[0],
          data: {}
        };
        return this.runMiddleware(req);
      } else {
        var lastRequest = _.chain(this.builderStack).last();

        var _req = {
          method: 'DELETE',
          url: this.urlFor(),
          model: lastRequest.get('model').value(),
          data: {}
        };

        if (this.resetBuilderOnCall) {
          this.resetBuilder();
        }

        return this.runMiddleware(_req);
      }
    }
  }, {
    key: 'insertMiddlewareBefore',
    value: function insertMiddlewareBefore(middlewareName, newMiddleware) {
      this.insertMiddleware(middlewareName, 'before', newMiddleware);
    }
  }, {
    key: 'insertMiddlewareAfter',
    value: function insertMiddlewareAfter(middlewareName, newMiddleware) {
      this.insertMiddleware(middlewareName, 'after', newMiddleware);
    }
  }, {
    key: 'insertMiddleware',
    value: function insertMiddleware(middlewareName, direction, newMiddleware) {
      var middleware = this.middleware.filter(function (middleware) {
        return middleware.name === middlewareName;
      });
      if (middleware.length > 0) {
        var index = this.middleware.indexOf(middleware[0]);
        if (direction === 'after') {
          index = index + 1;
        }
        this.middleware.splice(index, 0, newMiddleware);
      }
    }
  }, {
    key: 'define',
    value: function define(modelName, attributes) {
      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      this.models[modelName] = {
        attributes: attributes,
        options: options
      };
    }
  }, {
    key: 'resetMiddleware',
    value: function resetMiddleware() {
      this.middleware = this._originalMiddleware.slice(0);
    }
  }, {
    key: 'applyRequestMiddleware',
    value: function applyRequestMiddleware(promise) {
      var requestMiddlewares = this.middleware.filter(function (middleware) {
        return middleware.req;
      });
      requestMiddlewares.forEach(function (middleware) {
        promise = promise.then(middleware.req);
      });
      return promise;
    }
  }, {
    key: 'applyResponseMiddleware',
    value: function applyResponseMiddleware(promise) {
      var responseMiddleware = this.middleware.filter(function (middleware) {
        return middleware.res;
      });
      responseMiddleware.forEach(function (middleware) {
        promise = promise.then(middleware.res);
      });
      return promise;
    }
  }, {
    key: 'applyErrorMiddleware',
    value: function applyErrorMiddleware(promise) {
      var errorsMiddleware = this.middleware.filter(function (middleware) {
        return middleware.error;
      });
      errorsMiddleware.forEach(function (middleware) {
        promise = promise.then(middleware.error);
      });
      return promise;
    }
  }, {
    key: 'runMiddleware',
    value: function runMiddleware(req) {
      var _this = this;

      var payload = { req: req, jsonApi: this };
      var requestPromise = Promise.resolve(payload);
      requestPromise = this.applyRequestMiddleware(requestPromise);
      return requestPromise.then(function (res) {
        payload.res = res;
        var responsePromise = Promise.resolve(payload);
        return _this.applyResponseMiddleware(responsePromise);
      }).catch(function (err) {
        _this.logger.error(err);
        var errorPromise = Promise.resolve(err);
        return _this.applyErrorMiddleware(errorPromise).then(function (err) {
          return Promise.reject(err);
        });
      });
    }
  }, {
    key: 'request',
    value: function request(url) {
      var method = arguments.length <= 1 || arguments[1] === undefined ? 'GET' : arguments[1];
      var params = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
      var data = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

      var req = { url: url, method: method, params: params, data: data };
      return this.runMiddleware(req);
    }
  }, {
    key: 'find',
    value: function find(modelName, id) {
      var params = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var req = {
        method: 'GET',
        url: this.urlFor({ model: modelName, id: id }),
        model: modelName,
        data: {},
        params: params
      };
      return this.runMiddleware(req);
    }
  }, {
    key: 'findAll',
    value: function findAll(modelName) {
      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var req = {
        method: 'GET',
        url: this.urlFor({ model: modelName }),
        model: modelName,
        params: params,
        data: {}
      };
      return this.runMiddleware(req);
    }
  }, {
    key: 'create',
    value: function create(modelName, payload) {
      var req = {
        method: 'POST',
        url: this.urlFor({ model: modelName }),
        model: modelName,
        data: payload
      };
      return this.runMiddleware(req);
    }
  }, {
    key: 'update',
    value: function update(modelName, payload) {
      var req = {
        method: 'PATCH',
        url: this.urlFor({ model: modelName, id: payload.id }),
        model: modelName,
        data: payload
      };
      return this.runMiddleware(req);
    }
  }, {
    key: 'modelFor',
    value: function modelFor(modelName) {
      return this.models[modelName];
    }
  }, {
    key: 'collectionPathFor',
    value: function collectionPathFor(modelName) {
      var collectionPath = _.get(this.models[modelName], 'options.collectionPath') || pluralize(modelName);
      return '' + collectionPath;
    }
  }, {
    key: 'resourcePathFor',
    value: function resourcePathFor(modelName, id) {
      var collectionPath = this.collectionPathFor(modelName);
      return collectionPath + '/' + encodeURIComponent(id);
    }
  }, {
    key: 'collectionUrlFor',
    value: function collectionUrlFor(modelName) {
      var collectionPath = this.collectionPathFor(modelName);
      return this.apiUrl + '/' + collectionPath;
    }
  }, {
    key: 'resourceUrlFor',
    value: function resourceUrlFor(modelName, id) {
      var resourcePath = this.resourcePathFor(modelName, id);
      return this.apiUrl + '/' + resourcePath;
    }
  }, {
    key: 'urlFor',
    value: function urlFor() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (!_.isUndefined(options.model) && !_.isUndefined(options.id)) {
        return this.resourceUrlFor(options.model, options.id);
      } else if (!_.isUndefined(options.model)) {
        return this.collectionUrlFor(options.model);
      } else {
        return this.buildUrl();
      }
    }
  }, {
    key: 'pathFor',
    value: function pathFor() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (!_.isUndefined(options.model) && !_.isUndefined(options.id)) {
        return this.resourcePathFor(options.model, options.id);
      } else if (!_.isUndefined(options.model)) {
        return this.collectionPathFor(options.model);
      } else {
        return this.buildPath();
      }
    }
  }]);

  return JsonApi;
}();

module.exports = JsonApi;