import { Logger, LogLevel } from './logger';
import * as pluralize from 'pluralize';
import * as serialize from './middleware/json-api/_serialize';
import * as deserialize from './middleware/json-api/_deserialize';
import {
  clone,
  defaultsDeep,
  findIndex,
  forOwn,
  get,
  hasIn,
  isArray,
  isNil,
  isPlainObject,
  isString,
  isUndefined,
  last,
  map as mapArray,
  set
} from 'lodash';

/*
 *   == JsonApiMiddleware
 *
 *   Here we construct the middleware stack that will handle building and making
 *   requests, as well as serializing and deserializing our payloads. Users can
 *   easily construct their own middleware layers that adhere to different
 *   standards.
 *
 */
import { jsonApiHttpBasicAuthMiddleware } from './middleware/json-api/req-http-basic-auth';
import { jsonApiPostMiddleware } from './middleware/json-api/req-post';
import { jsonApiPatchMiddleware } from './middleware/json-api/req-patch';
import { jsonApiDeleteMiddleware } from './middleware/json-api/req-delete';
import { jsonApiGetMiddleware } from './middleware/json-api/req-get';
import { jsonApiHeadersMiddleware } from './middleware/json-api/req-headers';
import { railsParamsSerializer } from './middleware/json-api/rails-params-serializer';
import { bearerTokenMiddleware } from './middleware/json-api/req-bearer';
import { sendRequestMiddleware } from './middleware/request';
import deserializeResponseMiddleware from './middleware/json-api/res-deserialize';
import * as errorsMiddleware from './middleware/json-api/res-errors';
import { Payload } from './middleware/interfaces/payload';
import { ApiRequest } from './middleware/interfaces/api-request';
import {
  catchError,
  combineLatest,
  from,
  map,
  Observable,
  of,
  switchMap
} from 'rxjs';
import { Middleware } from './middleware/interfaces/middleware';
import { ApiResponse } from './middleware/interfaces/api-response';

export class JsonApi {
  private _originalMiddleware: any;
  private middleware: any;
  public headers: { [key: string]: string };
  public auth: { [key: string]: string };
  private readonly apiUrl: string;
  public bearer: string;
  private readonly logger: boolean;
  private readonly loglevel: LogLevel;
  private readonly models: { [key: string]: any };
  private deserialize: any;
  private serialize: any;
  private builderStack: any[];
  private readonly resetBuilderOnCall: boolean;
  private readonly pluralize: any;
  private trailingSlash: any;

  constructor(options: { [key: string]: any } = {}) {
    if (
      !(
        arguments.length === 2 &&
        isString(arguments[0]) &&
        isArray(arguments[1])
      ) &&
      !(
        arguments.length === 1 &&
        (isPlainObject(arguments[0]) || isString(arguments[0]))
      )
    ) {
      throw new Error('Invalid argument, initialize Devour with an object.');
    }

    const processErrors = errorsMiddleware.getMiddleware(options);

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
    ];
    const defaults: { [key: string]: any } = {
      middleware: jsonApiMiddleware,
      logger: true,
      loglevel: LogLevel.INFO,
      resetBuilderOnCall: true,
      auth: {},
      bearer: null,
      trailingSlash: { collection: false, resource: false }
    };

    const deprecatedConstructors = (args) => {
      return args.length === 2 || (args.length === 1 && isString(args[0]));
    };

    if (deprecatedConstructors(arguments)) {
      defaults.apiUrl = arguments[0];
      if (arguments.length === 2) {
        defaults.middleware = arguments[1];
      }
    }

    options = defaultsDeep(options, defaults);
    const middleware = options.middleware;

    this._originalMiddleware = middleware.slice(0);
    this.middleware = middleware.slice(0);
    this.headers = {};
    this.auth = options.auth;
    this.apiUrl = options.apiUrl;
    this.bearer = options.bearer;
    this.logger = options.logger;
    this.loglevel = options.loglevel;
    this.models = {};
    this.deserialize = deserialize;
    this.serialize = serialize;
    this.builderStack = [];
    this.resetBuilderOnCall = !!options.resetBuilderOnCall;
    if (options.pluralize === false) {
      this.pluralize = (s) => s;
      this.pluralize.singular = (s) => s;
    } else if ('pluralize' in options) {
      this.pluralize = options.pluralize;
    } else {
      this.pluralize = pluralize;
    }
    this.trailingSlash =
      options.trailingSlash === true
        ? forOwn(clone(defaults.trailingSlash), (v, k, o) => {
            set(o, k, true);
          })
        : options.trailingSlash;

    if (this.logger) {
      Logger.setLogLevel(this.loglevel);
    } else {
      Logger.disable();
    }

    /*
                                                                                                                                                                                                                                            Logger.debug('debug');
                                                                                                                                                                                                                                            Logger.info('info');
                                                                                                                                                                                                                                            Logger.warn('warn');
                                                                                                                                                                                                                                            Logger.error('error');
                                                                                                                                                                                                                                            */

    if (deprecatedConstructors(arguments)) {
      Logger.warn(
        'Constructor (apiUrl, middleware) has been deprecated, initialize Devour with an object.'
      );
    }
  }

  enableLogging(enabled = true) {
    enabled ? Logger.enable() : Logger.disable();
  }

  one(model, id) {
    this.builderStack.push({
      model: model,
      id: id,
      path: this.resourcePathFor(model, id)
    });
    return this;
  }

  all(model) {
    this.builderStack.push({
      model: model,
      path: this.collectionPathFor(model)
    });
    return this;
  }

  relationships(relationshipName) {
    const lastRequest = last(this.builderStack);
    this.builderStack.push({ path: 'relationships' });
    if (!relationshipName) return this;

    const modelName = get(lastRequest, 'model');
    if (!modelName) {
      throw new Error('Relationships must be called with a preceding model.');
    }

    const relationship = this.relationshipFor(modelName, relationshipName);

    this.builderStack.push({
      path: relationshipName,
      model: relationship.type
    });

    return this;
  }

  resetBuilder() {
    this.builderStack = [];
  }

  stackForResource() {
    return hasIn(last(this.builderStack), 'id');
  }

  addSlash() {
    return this.stackForResource()
      ? this.trailingSlash.resource
      : this.trailingSlash.collection;
  }

  buildPath() {
    return mapArray(this.builderStack, 'path').join('/');
  }

  buildUrl() {
    const path = this.buildPath();
    const slash = path !== '' && this.addSlash() ? '/' : '';
    return `${this.apiUrl}/${path}${slash}`;
  }

  get(params = {}) {
    const lastRequest = last(this.builderStack);

    const req = {
      method: 'GET',
      url: this.urlFor(),
      model: get(lastRequest, 'model'),
      data: {},
      params
    };

    if (this.resetBuilderOnCall) {
      this.resetBuilder();
    }

    return this.runMiddleware(req);
  }

  post(payload, params = {}, meta = {}) {
    const lastRequest = last(this.builderStack);

    const req = {
      method: 'POST',
      url: this.urlFor(),
      model: get(lastRequest, 'model'),
      data: payload,
      params,
      meta
    };

    if (this.resetBuilderOnCall) {
      this.resetBuilder();
    }

    return this.runMiddleware(req);
  }

  patch(payload, params = {}, meta = {}) {
    const lastRequest = last(this.builderStack);

    const req = {
      method: 'PATCH',
      url: this.urlFor(),
      model: get(lastRequest, 'model'),
      data: payload,
      params,
      meta
    };

    if (this.resetBuilderOnCall) {
      this.resetBuilder();
    }

    return this.runMiddleware(req);
  }

  /**
   * destroy (modelName, id, [payload], [meta])
   * or
   * destroy ([payload])
   * [] = optional
   * @param args
   */
  destroy(...args) {
    let req;

    if (args.length >= 2) {
      // destroy (modelName, id, [payload], [meta])
      const [model, id, data, meta] = [...Array.from(args)];

      console.assert(model, 'No model specified');
      console.assert(id, 'No ID specified');
      req = {
        method: 'DELETE',
        url: this.urlFor({ model, id }),
        model: model,
        data: data || {},
        meta: meta || {}
      };
    } else {
      // destroy ([payload])
      // TODO: find a way to pass meta
      const lastRequest = last(this.builderStack);

      req = {
        method: 'DELETE',
        url: this.urlFor(),
        model: get(lastRequest, 'model'),
        data: args.length === 1 ? args[0] : {}
      };

      if (this.resetBuilderOnCall) {
        this.resetBuilder();
      }
    }

    return this.runMiddleware(req);
  }

  insertMiddlewareBefore(middlewareName, newMiddleware) {
    this.insertMiddleware(middlewareName, 'before', newMiddleware);
  }

  insertMiddlewareAfter(middlewareName, newMiddleware) {
    this.insertMiddleware(middlewareName, 'after', newMiddleware);
  }

  insertMiddleware(middlewareName, direction, newMiddleware) {
    if (this.middlewareExists(newMiddleware.name)) {
      Logger.error('The middleware ' + newMiddleware.name + ' already exists');
      return;
    }

    const middleware = this.middleware.filter(
      (middleware) => middleware.name === middlewareName
    );
    if (middleware.length > 0) {
      let index = this.middleware.indexOf(middleware[0]);
      if (direction === 'after') {
        index = index + 1;
      }
      this.middleware.splice(index, 0, newMiddleware);
    }
  }

  replaceMiddleware(middlewareName, newMiddleware) {
    if (!this.middlewareExists(middlewareName)) {
      Logger.error('The middleware ' + middlewareName + ' does not exist');
      return;
    }

    if (this.middlewareExists(newMiddleware.name)) {
      Logger.error('The middleware ' + newMiddleware.name + ' already exists');
      return;
    }

    const index = findIndex(this.middleware, ['name', middlewareName]);
    this.middleware[index] = newMiddleware;
  }

  removeMiddleware(middlewareName) {
    if (!this.middlewareExists(middlewareName)) {
      Logger.error('The middleware ' + middlewareName + ' does not exist');
      return;
    }

    const index = findIndex(this.middleware, ['name', middlewareName]);
    this.middleware.splice(index, 1);
  }

  middlewareExists(middlewareName) {
    return this.middleware.some(
      (middleware) => middleware.name === middlewareName
    );
  }

  define(
    modelName: string,
    attributes: { [key: string]: any },
    options: { [key: string]: any } = {}
  ) {
    this.models[modelName] = {
      attributes: attributes,
      options: options
    };
  }

  resetMiddleware() {
    this.middleware = this._originalMiddleware.slice(0);
  }

  applyRequestMiddleware(payload: Payload): Observable<Payload> {
    const requestMiddlewares = this.middleware.filter(
      (middleware) => middleware.req
    );
    const newPayloads: Observable<any>[] = [];
    requestMiddlewares.forEach((middleware: Middleware) => {
      const newPayload = middleware.req(payload);
      if (newPayload instanceof Promise) {
        newPayloads.push(from(newPayload));
      } else {
        newPayloads.push(of(middleware.req(payload)));
      }
    });
    return combineLatest(newPayloads).pipe(
      map((newPayloads: Payload[]) => {
        return newPayloads.reduce((acc, newPayload) => {
          return { ...acc, ...newPayload };
        });
      })
    );
  }

  applyResponseMiddleware(payload: Payload): Observable<ApiResponse> {
    const responseMiddlewares = this.middleware.filter(
      (middleware) => middleware.res
    );
    let response: ApiResponse;
    responseMiddlewares.forEach((middleware: Middleware) => {
      response = middleware.res(payload);
    });
    return of(response);
  }

  applyErrorMiddleware(payload: Payload): Observable<Payload> {
    const errorsMiddleware = this.middleware.filter(
      (middleware: Middleware) => middleware.error
    );
    let newPayload: Payload;
    errorsMiddleware.forEach((middleware: Middleware) => {
      newPayload = middleware.error(payload);
    });
    return of(newPayload);
  }

  runMiddleware(req: ApiRequest): Observable<any> {
    const jsonApi = this;
    const payload$: Observable<Payload> = of({
      req: req,
      jsonApi: jsonApi
    });
    return payload$.pipe(
      switchMap((payload: Payload) => this.applyRequestMiddleware(payload)),
      map((payload: Payload) => {
        return { ...payload, ...{ res: payload } };
      }),
      switchMap((payload) => this.applyResponseMiddleware(payload)),
      catchError((err) => {
        Logger.error(err);
        return this.applyErrorMiddleware(err);
      })
    );
  }

  request(url, method = 'GET', params = {}, data = {}) {
    const req: ApiRequest = { url, method, params, data };
    return this.runMiddleware(req);
  }

  find(modelName, id, params = {}) {
    const req = {
      method: 'GET',
      url: this.urlFor({ model: modelName, id: id }),
      model: modelName,
      data: {},
      params: params
    };
    return this.runMiddleware(req);
  }

  findAll(modelName, params = {}) {
    const req: ApiRequest = {
      method: 'GET',
      url: this.urlFor({ model: modelName }),
      model: modelName,
      params: params,
      data: {}
    };
    return this.runMiddleware(req);
  }

  create(modelName, payload, params = {}, meta = {}) {
    const req = {
      method: 'POST',
      url: this.urlFor({ model: modelName }),
      model: modelName,
      params: params,
      data: payload,
      meta: meta
    };
    return this.runMiddleware(req);
  }

  update(modelName, payload, params = {}, meta = {}) {
    const req = {
      method: 'PATCH',
      url: this.urlFor({ model: modelName, id: payload.id }),
      model: modelName,
      data: payload,
      params: params,
      meta: meta
    };
    return this.runMiddleware(req);
  }

  modelFor(modelName) {
    if (!this.models[modelName]) {
      throw new Error(
        `API resource definition for model "${modelName}" not found. Available models: ${Object.keys(
          this.models
        )}`
      );
    }

    return this.models[modelName];
  }

  relationshipFor(modelName, relationshipName) {
    const model = this.modelFor(modelName);
    const relationship = model.attributes[relationshipName];

    if (!relationship) {
      throw new Error(
        `API resource definition on model "${modelName}" for relationship "${relationshipName}" not found. Available attributes: ${Object.keys(
          model.attributes
        )}`
      );
    }

    return relationship;
  }

  collectionPathFor(modelName) {
    const collectionPath =
      get(this.models[modelName], 'options.collectionPath') ||
      this.pluralize(modelName);
    return `${collectionPath}`;
  }

  resourcePathFor(modelName, id) {
    if (isNil(id)) {
      throw new Error(`No ID specified; id is '${id}'`);
    }
    const collectionPath = this.collectionPathFor(modelName);
    return `${collectionPath}/${encodeURIComponent(id)}`;
  }

  collectionUrlFor(modelName) {
    const collectionPath = this.collectionPathFor(modelName);
    const trailingSlash = this.trailingSlash.collection ? '/' : '';
    return `${this.apiUrl}/${collectionPath}${trailingSlash}`;
  }

  resourceUrlFor(modelName, id) {
    const resourcePath = this.resourcePathFor(modelName, id);
    const trailingSlash = this.trailingSlash.resource ? '/' : '';
    return `${this.apiUrl}/${resourcePath}${trailingSlash}`;
  }

  urlFor(options: { [key: string]: any } = {}) {
    if (!isUndefined(options.model) && !isUndefined(options.id)) {
      return this.resourceUrlFor(options.model, options.id);
    } else if (!isUndefined(options.model)) {
      return this.collectionUrlFor(options.model);
    } else {
      return this.buildUrl();
    }
  }

  pathFor(options: { [key: string]: any } = {}) {
    if (!isUndefined(options.model) && !isUndefined(options.id)) {
      return this.resourcePathFor(options.model, options.id);
    } else if (!isUndefined(options.model)) {
      return this.collectionPathFor(options.model);
    } else {
      return this.buildPath();
    }
  }
}
