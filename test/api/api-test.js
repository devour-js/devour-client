/* global describe, context, it, beforeEach, afterEach */

import JsonApi from '../../src/index'
import jsonApiGetMiddleware from '../../src/middleware/json-api/req-get'
import jsonApiDeleteMiddleware from '../../src/middleware/json-api/req-delete'
import mockResponse from '../helpers/mock-response'
import expect from 'expect.js'
import sinon from 'sinon'
import _last from 'lodash/last'

describe('JsonApi', () => {
  var jsonApi = null
  beforeEach(() => {
    jsonApi = new JsonApi({apiUrl: 'http://myapi.com'})
  })

  afterEach(() => {
    jsonApi.resetBuilder()
  })

  describe('Constructors', () => {
    it('should allow both object and deprecated constructors to be used', () => {
      let jsonApi
      jsonApi = new JsonApi('http://myapi.com')
      expect(jsonApi).to.be.a(JsonApi)
      jsonApi = new JsonApi('http://myapi.com', [])
      expect(jsonApi).to.be.a(JsonApi)
      jsonApi = new JsonApi({apiUrl: 'http://myapi.com'})
      expect(jsonApi).to.be.a(JsonApi)
    })

    it('should allow apiUrl to be set via the initializer object', () => {
      let jsonApi = new JsonApi({apiUrl: 'http://myapi.com'})
      expect(jsonApi.apiUrl).to.eql('http://myapi.com')
    })

    it('should allow middleware to be set via the initializer object', () => {
      let middleware = [
        {
          name: 'm1',
          req: function (req) {
            return req
          },
          res: function (res) {
            return res
          }
        },
        {
          name: 'm2',
          req: function (req) {
            return req
          },
          res: function (res) {
            return res
          }
        }
      ]

      let jsonApi = new JsonApi({apiUrl: 'http://myapi.com', middleware: middleware})
      expect(jsonApi.middleware).to.eql(middleware)
      expect(jsonApi.apiUrl).to.eql('http://myapi.com')
    })

    it('should set the apiUrl during setup', () => {
      expect(jsonApi.apiUrl).to.eql('http://myapi.com')
    })

    it('should have a empty models and middleware properties after instantiation', () => {
      expect(jsonApi.models).to.be.an('object')
      expect(jsonApi.middleware).to.be.an('array')
    })

    it('should initialize with an empty headers object', () => {
      expect(jsonApi.headers).to.be.an('object')
      expect(jsonApi.headers).to.eql({})
    })

    it('should allow users to add headers', () => {
      jsonApi.headers['A-Header-Name'] = 'a value'
      expect(jsonApi.headers).to.eql({
        'A-Header-Name': 'a value'
      })
    })

    it('should allow users to add HTTP Basic Auth options', (done) => {
      jsonApi = new JsonApi({apiUrl: 'http://myapi.com', auth: {username: 'admin', password: 'cheesecake'}})

      jsonApi.define('foo', {title: ''})

      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.auth).to.be.eql({username: 'admin', password: 'cheesecake'})
          return {}
        }
      }

      const jsonApiHttpBasicAuthMiddleware = require('./../../src/middleware/json-api/req-http-basic-auth')

      jsonApi.middleware = [jsonApiHttpBasicAuthMiddleware, inspectorMiddleware]

      jsonApi.one('foo', 1).get().then(() => done())
    })

    describe('Pluralize options', () => {
      context('no options passed -- default behavior', () => {
        it('should use the pluralize package', () => {
          jsonApi = new JsonApi({apiUrl: 'http://myapi.com'})
          expect(jsonApi.pluralize).to.eql(require('pluralize'))
        })
      })

      context('false -- no pluralization', () => {
        it('should not pluralize text', () => {
          jsonApi = new JsonApi({apiUrl: 'http://myapi.com', pluralize: false})
          expect(jsonApi.pluralize('model')).to.eql('model')
          expect(jsonApi.pluralize.singular('models')).to.eql('models')
        })
      })

      context('custom pluralization', () => {
        it('should pluralize as requested', () => {
          const pluralizer = s => 'Q' + s
          pluralizer.singular = s => s.replace(/^Q/, '')
          jsonApi = new JsonApi({apiUrl: 'http://myapi.com', pluralize: pluralizer})
          expect(jsonApi.pluralize('model')).to.eql('Qmodel')
          expect(jsonApi.pluralize.singular('Qmodel')).to.eql('model')
        })
      })
    })

    describe('Trailing Slash options', () => {
      context('no options passed -- default behavior', () => {
        it('should use the default of no slashes for either url type', () => {
          jsonApi = new JsonApi({apiUrl: 'http://myapi.com'})
          expect(jsonApi.trailingSlash).to.eql({collection: false, resource: false})
        })
      })

      context('option to add slashes to all urls', () => {
        it('should use slashes for both url types', () => {
          jsonApi = new JsonApi({apiUrl: 'http://myapi.com', trailingSlash: true})
          expect(jsonApi.trailingSlash).to.eql({collection: true, resource: true})
        })
      })

      context('option to add slashes to only collection urls', () => {
        it('should only use slashes for collection urls', () => {
          jsonApi = new JsonApi({apiUrl: 'http://myapi.com', trailingSlash: { collection: true }})
          expect(jsonApi.trailingSlash).to.eql({collection: true, resource: false})
        })
      })

      context('option to add slashes to only resource urls', () => {
        it('should only use slashes for resource urls', () => {
          jsonApi = new JsonApi({apiUrl: 'http://myapi.com', trailingSlash: { resource: true }})
          expect(jsonApi.trailingSlash).to.eql({collection: false, resource: true})
        })
      })
    })

    it.skip('should throw Exception if the constructor does not receive proper arguments', () => {
      expect(function () {
        throw new Error('boom!')
      }).toThrow(/boom/)
    })
  })

  describe('urlFor, pathFor and path builders', () => {
    context('default no trailing slashes', () => {
      it('should construct collection paths for models', () => {
        jsonApi.define('product', {})
        expect(jsonApi.collectionPathFor('product')).to.eql('products')
      })

      it('should allow overrides for collection paths', () => {
        jsonApi.define('product', {}, {collectionPath: 'my-products'})
        expect(jsonApi.collectionPathFor('product')).to.eql('my-products')
      })

      it('should allow arbitrary collections without a model', () => {
        expect(jsonApi.collectionPathFor('foo')).to.eql('foos')
      })

      it('should construct single resource paths for models', () => {
        jsonApi.define('product', {})
        expect(jsonApi.resourcePathFor('product', 1)).to.eql('products/1')
      })

      it('should construct collection urls for models', () => {
        jsonApi.define('product', {})
        expect(jsonApi.collectionUrlFor('product')).to.eql('http://myapi.com/products')
      })

      it('should construct single resource urls for models', () => {
        jsonApi.define('product', {})
        expect(jsonApi.resourceUrlFor('product', 1)).to.eql('http://myapi.com/products/1')
      })

      it('should allow urlFor to be called with various options', () => {
        expect(jsonApi.urlFor({model: 'foo', id: 1})).to.eql('http://myapi.com/foos/1')
        expect(jsonApi.urlFor({model: 'foo'})).to.eql('http://myapi.com/foos')
        expect(jsonApi.urlFor({})).to.eql('http://myapi.com/')
        expect(jsonApi.urlFor()).to.eql('http://myapi.com/')
        expect(jsonApi.all('foo').urlFor()).to.eql('http://myapi.com/foos')
      })

      it('should allow pathFor to be called with various options', () => {
        expect(jsonApi.pathFor({model: 'foo', id: 1})).to.eql('foos/1')
        expect(jsonApi.pathFor({model: 'foo'})).to.eql('foos')
        expect(jsonApi.pathFor({})).to.eql('')
        expect(jsonApi.pathFor()).to.eql('')
        expect(jsonApi.all('foo').pathFor()).to.eql('foos')
      })
    })

    context('with collection and resource trailing slashes', () => {
      beforeEach(() => {
        jsonApi = new JsonApi({apiUrl: 'http://myapi.com', trailingSlash: {collection: true, resource: true}})
      })

      afterEach(() => {
        jsonApi.resetBuilder()
      })

      it('should construct collection urls', () => {
        jsonApi.define('product', {})
        expect(jsonApi.collectionUrlFor('product')).to.eql('http://myapi.com/products/')
      })

      it('should construct resource urls', () => {
        jsonApi.define('product', {})
        expect(jsonApi.resourceUrlFor('product', 1)).to.eql('http://myapi.com/products/1/')
      })

      it('should construct collection urls with urlFor', () => {
        expect(jsonApi.urlFor({model: 'foo'})).to.eql('http://myapi.com/foos/')
        expect(jsonApi.all('foo').urlFor()).to.eql('http://myapi.com/foos/')
      })

      it('should construct complex collection urls with urlFor', () => {
        expect(jsonApi.urlFor({model: 'foo'})).to.eql('http://myapi.com/foos/')
        expect(jsonApi.one('bar', '1').all('foo').urlFor()).to.eql('http://myapi.com/bars/1/foos/')
      })

      it('should construct the relationships URL', () => {
        expect(jsonApi.one('bar', '1').relationships().all('foo').urlFor()).to.eql('http://myapi.com/bars/1/relationships/foos/')
      })

      context('with relationships which arent named after their type', () => {
        beforeEach(() => {
          jsonApi.define('product')
          jsonApi.define('order', { items: { jsonApi: 'hasMany', type: 'product' } })
        })

        it('should construct the relationship URL', () => {
          const url = jsonApi.one('order', 1).relationships('items').urlFor()

          expect(url).to.eql('http://myapi.com/orders/1/relationships/items/')
        })

        it('should be able to update the relationships', (done) => {
          let inspectorMiddleware = {
            name: 'inspector-middleware',
            req: (payload) => {
              expect(payload.req.method).to.be.eql('PATCH')
              expect(payload.req.url).to.be.eql('http://myapi.com/orders/1/relationships/items/')
              expect(payload.req.data).to.be.eql([{ id: 2 }])
              return {}
            }
          }

          jsonApi.middleware = [inspectorMiddleware]

          jsonApi.one('order', 1).relationships('items').patch([{ id: 2 }])
            .then(() => done())
            .catch(() => done())
        })

        it('should be able to delete the relationships', (done) => {
          let inspectorMiddleware = {
            name: 'inspector-middleware',
            req: (payload) => {
              expect(payload.req.method).to.be.eql('DELETE')
              expect(payload.req.url).to.be.eql('http://myapi.com/orders/1/relationships/items/')
              expect(payload.req.data).to.be.eql([{ id: 2 }])
              return {}
            }
          }
          jsonApi.middleware = [inspectorMiddleware]

          jsonApi.one('order', 1).relationships('items').destroy([{ id: 2 }])
            .then(() => done())
            .catch(() => done())
        })

        it('sets the model correctly for serialization', () => {
          jsonApi.one('order', 1).relationships('items')

          expect(_last(jsonApi.builderStack).model).to.eql('product')
        })

        it('complains if the relationship is not defined', () => {
          expect(function (done) {
            jsonApi.one('order', 1).relationships('baz').patch({}).then(done).catch(done)
          }).to.throwException(/API resource definition on model "order" for relationship "baz"/)
        })

        it('complains if relationships is called without a model', () => {
          expect(function (done) {
            jsonApi.relationships('baz').patch({}).then(done).catch(done)
          }).to.throwException(/Relationships must be called with a preceeding model/)
        })
      })

      it('should construct resource urls with urlFor', () => {
        expect(jsonApi.urlFor({model: 'foo', id: '1'})).to.eql('http://myapi.com/foos/1/')
        expect(jsonApi.one('foo', '1').urlFor()).to.eql('http://myapi.com/foos/1/')
      })
      it('should construct complex resource urls with urlFor', () => {
        expect(jsonApi.all('bars').one('foo', '1').urlFor()).to.eql('http://myapi.com/bars/foos/1/')
      })
    })

    context('with only collection trailing slashes', () => {
      beforeEach(() => {
        jsonApi = new JsonApi({apiUrl: 'http://myapi.com', trailingSlash: {collection: true, resource: false}})
      })

      afterEach(() => {
        jsonApi.resetBuilder()
      })

      it('should construct resource urls with urlFor without trailing slashes', () => {
        expect(jsonApi.urlFor({model: 'foo', id: '1'})).to.eql('http://myapi.com/foos/1')
        expect(jsonApi.one('foo', '1').urlFor()).to.eql('http://myapi.com/foos/1')
      })
    })

    context('with only resource trailing slashes', () => {
      beforeEach(() => {
        jsonApi = new JsonApi({apiUrl: 'http://myapi.com', trailingSlash: {collection: false, resource: true}})
      })

      afterEach(() => {
        jsonApi.resetBuilder()
      })

      it('should construct collection urls with urlFor without trailing slashes', () => {
        expect(jsonApi.urlFor({model: 'foo'})).to.eql('http://myapi.com/foos')
        expect(jsonApi.all('foo').urlFor()).to.eql('http://myapi.com/foos')
      })
    })
  })

  describe('Middleware', () => {
    it('should allow users to register middleware', () => {
      let catMiddleWare = {
        name: 'cat-middleware',
        req: function (req) {
          return req
        },
        res: function (res) {
          return res
        }
      }
      jsonApi.middleware.unshift(catMiddleWare)
      expect(jsonApi.middleware[0].name).to.eql('cat-middleware')
    })

    it('should allow users to register middleware before or after existing middleware', () => {
      let responseMiddleware = jsonApi.middleware.filter(middleware => middleware.name === 'response')[0]
      let beforeMiddleware = {
        name: 'before'
      }
      let afterMiddleware = {
        name: 'after'
      }
      let index = jsonApi.middleware.indexOf(responseMiddleware)
      jsonApi.insertMiddlewareBefore('response', beforeMiddleware)
      jsonApi.insertMiddlewareAfter('response', afterMiddleware)
      expect(jsonApi.middleware.indexOf(beforeMiddleware)).to.eql(index)
      expect(jsonApi.middleware.indexOf(afterMiddleware)).to.eql(index + 2)
    })
  })

  describe('Models and serializers', () => {
    it('should expose the serialize and deserialize objects', () => {
      expect(jsonApi.serialize.collection).to.be.a('function')
      expect(jsonApi.serialize.resource).to.be.a('function')
      expect(jsonApi.deserialize.collection).to.be.a('function')
      expect(jsonApi.deserialize.resource).to.be.a('function')
    })

    it('should allow users to define models', () => {
      jsonApi.define('product', {
        id: '',
        title: ''
      })
      expect(jsonApi.models['product']).to.be.an('object')
      expect(jsonApi.models['product']['attributes']).to.have.key('id')
      expect(jsonApi.models['product']['attributes']).to.have.key('title')
    })
  })

  describe('Basic API calls', () => {
    it('should make basic find calls', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: {
            id: '1',
            type: 'products',
            attributes: {
              title: 'Some Title'
            }
          }
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.find('product', 1).then(({ data, errors, meta, links }) => {
        expect(data.id).to.eql('1')
        expect(data.title).to.eql('Some Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should make basic findAll calls', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [
            {
              id: '1',
              type: 'products',
              attributes: {
                title: 'Some Title'
              }
            },
            {
              id: '2',
              type: 'products',
              attributes: {
                title: 'Another Title'
              }
            }
          ]
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.findAll('product').then(({ data, errors, meta, links }) => {
        expect(data[0].id).to.eql('1')
        expect(data[0].title).to.eql('Some Title')
        expect(data[1].id).to.eql('2')
        expect(data[1].title).to.eql('Another Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should make basic create call', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('POST')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos')
          expect(payload.req.data).to.be.eql({title: 'foo'})
          expect(payload.req.params).to.be.eql({include: 'something'})
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.define('foo', {
        title: ''
      })

      jsonApi.create('foo', {title: 'foo'}, {include: 'something'})
        .then(() => done()).catch(() => done())
    })

    it('should make basic update call', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos')
          expect(payload.req.data).to.be.eql({title: 'foo'})
          expect(payload.req.params).to.be.eql({include: 'something'})
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.define('foo', {
        title: ''
      })

      jsonApi.update('foo', {title: 'foo'}, {include: 'something'})
        .then(() => done()).catch(() => done())
    })

    it('should include meta information on response objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 1
          },
          data: [{
            id: '1',
            type: 'products',
            attributes: {
              title: 'Some Title'
            }
          }]
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.findAll('product').then(({ data, errors, meta, links }) => {
        expect(meta.totalObjects).to.eql(1)
        expect(data[0].id).to.eql('1')
        expect(data[0].title).to.eql('Some Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should include meta information on response data objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 1
          },
          data: [{
            id: '1',
            type: 'products',
            attributes: {
              title: 'Some Title'
            },
            meta: {
              totalAttributes: 1
            }
          }]
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.findAll('product').then(({ data, errors, meta, links }) => {
        expect(data[0].meta.totalAttributes).to.eql(1)
        expect(data[0].id).to.eql('1')
        expect(data[0].title).to.eql('Some Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should include links information on response objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 13
          },
          data: [{
            id: '1',
            type: 'products',
            attributes: {
              title: 'Some Title'
            }
          }],
          links: {
            self: 'http://example.com/products?page[number]=3&page[size]=1',
            first: 'http://example.com/products?page[number]=1&page[size]=1',
            prev: 'http://example.com/products?page[number]=2&page[size]=1',
            next: 'http://example.com/products?page[number]=4&page[size]=1',
            last: 'http://example.com/products?page[number]=13&page[size]=1'
          }
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.findAll('product').then(({ data, errors, meta, links }) => {
        expect(links.self).to.eql('http://example.com/products?page[number]=3&page[size]=1')
        expect(links.first).to.eql('http://example.com/products?page[number]=1&page[size]=1')
        expect(links.prev).to.eql('http://example.com/products?page[number]=2&page[size]=1')
        expect(links.next).to.eql('http://example.com/products?page[number]=4&page[size]=1')
        expect(links.last).to.eql('http://example.com/products?page[number]=13&page[size]=1')
        expect(data[0].id).to.eql('1')
        expect(data[0].title).to.eql('Some Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should include links information on response data objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 13
          },
          data: [{
            id: '1',
            type: 'products',
            attributes: {
              title: 'Some Title'
            },
            links: {
              self: 'http://example.com/products/1'
            }
          }],
          links: {
            self: 'http://example.com/products?page[number]=3&page[size]=1',
            first: 'http://example.com/products?page[number]=1&page[size]=1',
            prev: 'http://example.com/products?page[number]=2&page[size]=1',
            next: 'http://example.com/products?page[number]=4&page[size]=1',
            last: 'http://example.com/products?page[number]=13&page[size]=1'
          }
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.findAll('product').then(({ data, errors, meta, links }) => {
        expect(data[0].links.self).to.eql('http://example.com/products/1')
        expect(data[0].id).to.eql('1')
        expect(data[0].title).to.eql('Some Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should include errors information on response objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [{
            id: '1',
            type: 'products',
            attributes: {
              title: 'Some Title'
            }
          }],
          errors: [
            {
              status: 422,
              source: { pointer: '/data/attributes/first-name' },
              title: 'Invalid Attribute',
              detail: 'First name must contain at least three characters.'
            }
          ]
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.findAll('product').then(({ data, errors, meta, links }) => {
        expect(errors[0].status).to.eql('422')
        expect(errors[0].source.pointer).to.eql('/data/attributes/first-name')
        expect(errors[0].title).to.eql('Invalid Attribute')
        expect(errors[0].detail).to.eql('First name must contain at least three characters.')
        expect(data[0].id).to.eql('1')
        expect(data[0].title).to.eql('Some Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should expose a method for arbitrary HTTP calls', () => {
      const url = 'https://example.com'
      const method = 'PATCH'
      const params = { id: 3 }
      const data = { body: 'something different' }

      jsonApi.runMiddleware = sinon.spy()

      jsonApi.request(url, method, params, data)

      expect(jsonApi.runMiddleware.called).to.be.truthy
      expect(jsonApi.runMiddleware.calledWith(url, method, params, data)).to.be.truthy
    })

    it('should handle null primary data', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: null
        }
      })
      jsonApi.define('product', {
        title: ''
      })
      jsonApi.find('product', 1).then(({ data, errors, meta, links }) => {
        expect(data).to.eql(null)
        done()
      }).catch(err => console.log(err))
    })

    it('should have an empty body on GET requests', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET')
          expect(payload.req.data).to.be(undefined)
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1')
          return {}
        }
      }

      jsonApi.middleware = [jsonApiGetMiddleware, inspectorMiddleware]

      jsonApi.one('foo', 1).find().then(() => done()).catch(() => done())
    })

    it('should have an empty body on DELETE requests', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE')
          expect(payload.req.data).to.be(undefined)
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1')
          return {}
        }
      }

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware]

      jsonApi.destroy('foo', 1).then(() => done()).catch(() => done())
    })

    it('should accept a data payload on DELETE requests when provided as a third argument', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE')
          expect(payload.req.data).to.be.an('object')
          expect(payload.req.data.data).to.be.an('array')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/relationships/bars')
          return {}
        }
      }

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware]

      const payload = [
        {type: 'bar', id: 2},
        {type: 'bar', id: 3}
      ]

      jsonApi.destroy('foo', 1, payload).then(() => done()).catch(() => done())
    })

    it('should accept a meta and data payload on DELETE requests when provided as a third and fourth arguments', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE')
          expect(payload.req.data).to.be.an('object')
          expect(payload.req.data.data).to.be.an('array')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/relationships/bars')
          expect(payload.req.meta.totalObjects).to.eql(1)

          return {}
        }
      }

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware]

      const payload = [
        {type: 'bar', id: 2},
        {type: 'bar', id: 3}
      ]

      const meta = {
        totalObjects: 1
      }

      jsonApi.destroy('foo', 1, payload, meta).then(() => done()).catch(() => done())
    })

    it('should accept a data payload on DELETE requests when provided as a single argument', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE')
          expect(payload.req.data).to.be.an('object')
          expect(payload.req.data.data).to.be.an('array')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/relationships/bars')
          return {}
        }
      }

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware]

      const payload = [
        {type: 'bar', id: 2},
        {type: 'bar', id: 3}
      ]

      jsonApi.one('foo', 1).relationships().all('bar').destroy(payload).then(() => done()).catch(() => done())
    })

    it.skip('should throw an error while attempting to access undefined model', function (done) {
      expect(function () { jsonApi.findAll('derp').then(done).catch(done) }).to.throwException(/API resource definition for model/)
    })
  })

  describe('Complex API calls', () => {
    it('should work on bidirectional connected entities', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: {
            id: '1',
            type: 'product',
            attributes: {
              title: 'Some Title'
            },
            relationships: {
              company: {
                data: {
                  type: 'company',
                  id: '42'
                }
              }
            }
          },
          included:
            [{
              type: 'company',
              id: '42',
              attributes: {
                brand: 'Cool Company'
              },
              relationships: {
                products: {
                  data: [{
                    type: 'product',
                    id: '1'
                  },
                  {
                    type: 'product',
                    id: '2'
                  }]
                }
              }
            },
            {
              id: '1',
              type: 'product',
              attributes: {
                title: 'Some Title'
              },
              relationships: {
                company: {
                  data: {
                    type: 'company',
                    id: '42'
                  }
                }
              }
            }
            ]
        }
      })

      jsonApi.define('product', {
        title: '',
        company: {
          jsonApi: 'hasOne',
          type: 'company'
        }
      })
      jsonApi.define('company', {
        brand: '',
        products: {
          jsonApi: 'hasMany',
          type: 'product'
        }
      })
      jsonApi.find('product', 42, { include: 'company,company.products' }).then(({ data, errors, meta, links }) => {
        expect(data.id).to.eql('1')
        expect(data.title).to.eql('Some Title')
        expect(data.company.id).to.eql('42')
        expect(data.company.brand).to.eql('Cool Company')
        expect(data.company.products[0].id).to.eql('1')
        expect(data.company.products[0].title).to.eql('Some Title')
        done()
      }).catch(err => console.log(err))
    })

    it('should not cache the second request', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [{
            id: '42',
            type: 'clan',
            attributes: {
              title: 'MyClan'
            },
            relationships: {
              leader: {
                data: {
                  type: 'player',
                  id: '5'
                }
              },
              memberships: {
                data: [{
                  type: 'clanMembership',
                  id: '15'
                }, {
                  type: 'clanMembership',
                  id: '16'
                }]
              }
            }
          }],
          included:
            [{
              type: 'clanMembership',
              id: '15',
              relationships: {
                clan: {
                  data: {
                    type: 'clan',
                    id: '42'
                  }
                },
                player: {
                  data: {
                    type: 'player',
                    id: '5'
                  }
                }
              }
            }, {
              type: 'clanMembership',
              id: '16',
              relationships: {
                clan: {
                  data: {
                    type: 'clan',
                    id: '42'
                  }
                },
                player: {
                  data: {
                    type: 'player',
                    id: '6'
                  }
                }
              }
            }, {
              type: 'player',
              id: '5',
              attributes: {
                name: 'Dragonfire'
              }
            }]
        }
      })

      jsonApi.define('clan', {
        title: '',
        leader: {
          jsonApi: 'hasOne',
          type: 'player'
        },
        memberships: {
          jsonApi: 'hasMany',
          type: 'clanMembership'
        }
      })
      jsonApi.define('clanMembership', {
        clan: {
          jsonApi: 'hasOne',
          type: 'clan'
        },
        player: {
          jsonApi: 'hasOne',
          type: 'player'
        }
      })
      jsonApi.define('player', {
        name: ''
      })

      jsonApi.findAll('clan', { include: 'memberships' }).then(({ data, errors, meta, links }) => {
        // console.log('request 1', clans);
        // console.log('memberships', clans[0].memberships);
        expect(data[0].memberships.length).to.eql(2)
        // expect(clans[0].memberships[0].clan.id).to.eql("42")
        // expect(clans[0].memberships[1].clan.id).to.eql("42")
        // second request
        mockResponse(jsonApi, {
          data: {
            data: {
              id: '42',
              type: 'clan',
              attributes: {
                title: 'MyClan'
              },
              relationships: {
                memberships: {
                  data: [{
                    type: 'clanMembership',
                    id: '15'
                  }, {
                    type: 'clanMembership',
                    id: '16'
                  }]
                }
              }
            },
            included:
            [{
              type: 'clanMembership',
              id: '15',
              relationships: {
                clan: {
                  data: {
                    type: 'clan',
                    id: '42'
                  }
                },
                player: {
                  data: {
                    type: 'player',
                    id: '5'
                  }
                }
              }
            }, {
              type: 'clanMembership',
              id: '16',
              relationships: {
                clan: {
                  data: {
                    type: 'clan',
                    id: '42'
                  }
                },
                player: {
                  data: {
                    type: 'player',
                    id: '6'
                  }
                }
              }
            }, {
              type: 'player',
              id: '5',
              attributes: {
                name: 'Dragonfire'
              }
            }, {
              type: 'player',
              id: '6',
              attributes: {
                name: 'nicooga'
              }
            }]
          }
        })
        jsonApi.find('clan', 42, { include: 'memberships,memberships.player' }).then(({ data, errors, meta, links }) => {
          // console.log('request 2: ', clan);
          expect(data.memberships[0].player.name).to.eql('Dragonfire')
          // expect(clan.memberships[0].clan.id).to.eql('42')
          expect(data.memberships[1].player.name).to.eql('nicooga')
          // expect(clan.memberships[1].clan.id).to.eql('42')
          done()
        }).catch(err => console.log(err))
      }).catch(err => console.log(err))
    })
  })

  describe('Builder pattern for route construction', () => {
    beforeEach(() => {
      jsonApi.define('foo', {title: ''})
      jsonApi.define('bar', {title: ''})
      jsonApi.define('baz', {title: ''})
    })

    it('should respect resetBuilderOnCall', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET')
          expect(payload.req.url).to.be.eql('http://myapi.com/')
          return {}
        }
      }
      jsonApi.middleware = [inspectorMiddleware]
      jsonApi.get()
        .then(() => {
          let inspectorMiddleware = {
            name: 'inspector-middleware',
            req: (payload) => {
              expect(payload.req.method).to.be.eql('GET')
              expect(payload.req.url).to.be.eql('http://myapi.com/foos')
              return {}
            }
          }
          jsonApi.middleware = [inspectorMiddleware]
          return jsonApi.all('foo').get()
        })
        .then(() => done())
        .catch(() => done())

      expect(jsonApi.buildUrl()).to.eql('http://myapi.com/')
    })

    it('should respect resetBuilderOnCall when it is disabled', (done) => {
      jsonApi = new JsonApi({apiUrl: 'http://myapi.com', resetBuilderOnCall: false})
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1')
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.one('foo', 1).get().then(() => {
        let inspectorMiddleware = {
          name: 'inspector-middleware',
          req: (payload) => {
            expect(payload.req.method).to.be.eql('GET')
            expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/bars')
            return {}
          }
        }

        jsonApi.middleware = [inspectorMiddleware]

        return jsonApi.all('bar').get().then(() => done())
      }).catch(() => done())
    })

    it('should allow builders to be used', () => {
      expect(jsonApi.buildUrl()).to.eql('http://myapi.com/')
    })

    it('should allow builders on all', () => {
      expect(jsonApi.all('foo').all('bar').all('baz').pathFor()).to.eql('foos/bars/bazs')

      jsonApi.resetBuilder()

      expect(jsonApi.all('foos').all('bars').all('bazs').pathFor()).to.eql('foos/bars/bazs')
    })

    it('should allow builders on one', () => {
      expect(jsonApi.one('foo', 1).one('bar', 2).one('baz', 3).pathFor()).to.eql('foos/1/bars/2/bazs/3')

      jsonApi.resetBuilder()

      expect(jsonApi.one('foos', 1).one('bars', 2).one('bazs', 3).pathFor()).to.eql('foos/1/bars/2/bazs/3')
    })

    it('should allow builders on all and one', () => {
      expect(jsonApi.one('foo', 1).one('bar', 2).all('baz').pathFor()).to.eql('foos/1/bars/2/bazs')

      jsonApi.resetBuilder()

      expect(jsonApi.one('foos', 1).one('bars', 2).all('bazs').pathFor()).to.eql('foos/1/bars/2/bazs')
    })

    it('should allow builders to be called to the base url', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [
            {
              id: '1',
              type: 'foo',
              attributes: {
                title: 'foo 1'
              }
            }
          ]
        }
      })

      jsonApi.get().then(({ data, errors, meta, links }) => {
        expect(data[0].id).to.eql('1')
        expect(data[0].title).to.eql('foo 1')
        done()
      }).catch(err => console.log(err))
    })

    it('should allow builders to be called with get', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET')
          expect(payload.req.url).to.be.eql('http://myapi.com/')
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.get().then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with get with query params', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET')
          expect(payload.req.url).to.be.eql('http://myapi.com/')
          expect(payload.req.params).to.be.eql({page: {number: 2}})
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.get({page: {number: 2}}).then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with get on all', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos')
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.all('foo').get().then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with get on one', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1')
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.one('foo', 1).get().then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with post', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('POST')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos')
          expect(payload.req.data).to.be.eql({title: 'foo'})
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.all('foo').post({title: 'foo'}).then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with post with nested one', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('POST')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/bars')
          expect(payload.req.data).to.be.eql({title: 'foo'})
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.one('foo', 1).all('bar').post({title: 'foo'}).then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with patch', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1')
          expect(payload.req.data).to.be.eql({title: 'bar'})
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.one('foo', 1).patch({title: 'bar'}).then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with patch with nested one', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/bars')
          expect(payload.req.data).to.be.eql({title: 'bar'})
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.one('foo', 1).all('bar').patch({title: 'bar'}).then(() => done()).catch(() => done())
    })

    it('should allow builders to be called with destroy', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1')
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.one('foo', 1).destroy().then(() => done()).catch(() => done())
    })
    it('should allow builders to be called with destroy with nested one', (done) => {
      let inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE')
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/bars/2')
          return {}
        }
      }

      jsonApi.middleware = [inspectorMiddleware]

      jsonApi.one('foo', 1).one('bar', 2).destroy().then(() => done()).catch(() => done())
    })

    it('should Wacky Waving Inflatable Arm-Flailing Tubeman! Wacky Waving Inflatable Arm-Flailing Tubeman! Wacky Waving Inflatable Arm-Flailing Tubeman!', () => {
      jsonApi.one('foo', 1).one('bar', 2).all('foo').one('bar', 3).all('baz').one('baz', 1).one('baz', 2).one('baz', 3)
      expect(jsonApi.pathFor()).to.be.eql('foos/1/bars/2/foos/bars/3/bazs/bazs/1/bazs/2/bazs/3')
      expect(jsonApi.urlFor()).to.be.eql('http://myapi.com/foos/1/bars/2/foos/bars/3/bazs/bazs/1/bazs/2/bazs/3')
    })
  })
})
