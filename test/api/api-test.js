/* global describe, it, beforeEach, afterEach */

import JsonApi from '../../src/index'
import jsonApiGetMiddleware from '../../src/middleware/json-api/req-get'
import jsonApiDeleteMiddleware from '../../src/middleware/json-api/req-delete'
import mockResponse from '../helpers/mock-response'
import expect from 'expect.js'
import sinon from 'sinon'

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

    it.skip('should throw Exception if the constructor does not receive proper arguments', () => {
      expect(function () {
        throw new Error('boom!')
      }).toThrow(/boom/)
    })
  })

  describe('urlFor, pathFor and path builders', () => {
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
      jsonApi.find('product', 1).then((product) => {
        expect(product.id).to.eql('1')
        expect(product.title).to.eql('Some Title')
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
      jsonApi.findAll('product').then((products) => {
        expect(products[0].id).to.eql('1')
        expect(products[0].title).to.eql('Some Title')
        expect(products[1].id).to.eql('2')
        expect(products[1].title).to.eql('Another Title')
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
      jsonApi.findAll('product').then((products) => {
        expect(products.meta.totalObjects).to.eql(1)
        expect(products[0].id).to.eql('1')
        expect(products[0].title).to.eql('Some Title')
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
      jsonApi.find('product', 1).then((product) => {
        expect(product).to.eql(null)
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

      jsonApi.get().then((foos) => {
        expect(foos[0].id).to.eql('1')
        expect(foos[0].title).to.eql('foo 1')
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
