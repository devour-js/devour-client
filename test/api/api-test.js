import JsonApi from '../../index'
import mockResponse from '../helpers/mock-response'
import expect from 'expect.js'

describe('JsonApi', ()=> {

  var jsonApi = null
  beforeEach(()=> {
    jsonApi = new JsonApi('http://myapi.com')
  })

  it('should set the apiUrl during setup', ()=> {
    expect(jsonApi.apiUrl).to.eql('http://myapi.com')
  })

  it('should expose the serialize and deserialize objects', ()=> {
    expect(jsonApi.serialize.collection).to.be.a('function')
    expect(jsonApi.serialize.resource).to.be.a('function')
    expect(jsonApi.deserialize.collection).to.be.a('function')
    expect(jsonApi.deserialize.resource).to.be.a('function')
  })

  it('should have a empty models and middleware properties after instantiation', ()=> {
    expect(jsonApi.models).to.be.an('object')
    expect(jsonApi.middleware).to.be.an('array')
  })

  it('should allow users to register middleware', ()=> {
    let catMiddleWare = {
      name: 'cat-middleware',
      req: function(req) {
        return req
      },
      res: function(res) {
        return res
      }
    }
    jsonApi.middleware.unshift(catMiddleWare)
    expect(jsonApi.middleware[0].name).to.eql('cat-middleware')
  })

  it('should initialize with an empty headers object', ()=> {
    expect(jsonApi.headers).to.be.an('object')
    expect(jsonApi.headers).to.eql({})
  })

  it('should allow users to add headers', ()=> {
    jsonApi.headers['A-Header-Name'] = 'a value'
    expect(jsonApi.headers).to.eql({
      'A-Header-Name':'a value'
    })
  })

  it('should allow users to register middleware before or after existing middleware', ()=> {
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

  it('should allow users to define models', ()=> {
    jsonApi.define('product', {
      id:    '',
      title: ''
    })
    expect(jsonApi.models['product']).to.be.an('object')
    expect(jsonApi.models['product']['attributes']).to.have.key('id')
    expect(jsonApi.models['product']['attributes']).to.have.key('title')
  })

  it('should construct collection paths for models', ()=> {
    jsonApi.define('product', {})
    expect(jsonApi.collectionPathFor('product')).to.eql('products')
  })

  it('should allow overrides for collection paths', ()=> {
    jsonApi.define('product', {}, {collectionPath: 'my-products'})
    expect(jsonApi.collectionPathFor('product')).to.eql('my-products')
  })

  it('should construct single resource paths for models', ()=> {
    jsonApi.define('product', {})
    expect(jsonApi.resourcePathFor('product', 1)).to.eql('products/1')
  })

  it('should construct collection urls for models', ()=> {
    jsonApi.define('product', {})
    expect(jsonApi.collectionUrlFor('product')).to.eql('http://myapi.com/products')
  })

  it('should construct single resource urls for models', ()=> {
    jsonApi.define('product', {})
    expect(jsonApi.resourceUrlFor('product', 1)).to.eql('http://myapi.com/products/1')
  })

  it('should make basic find calls', (done)=> {
    mockResponse(jsonApi, {
      data: {
        data: {
          id: '1',
          type: 'products',
          attributes: {
            'title': 'Some Title'
          }
        }
      }
    })
    jsonApi.define('product', {
      title: ''
    })
    jsonApi.find('product', 1).then((product)=> {
      expect(product.id).to.eql('1')
      expect(product.title).to.eql('Some Title')
      done()
    }).catch(err => console.log(err))
  })

  it('should make basic findAll calls', (done)=> {
    mockResponse(jsonApi, {
      data: {
        data: [
          {
            id: '1',
            type: 'products',
            attributes: {
              'title': 'Some Title'
            }
          },
          {
            id: '2',
            type: 'products',
            attributes: {
              'title': 'Another Title'
            }
          }
        ]
      }
    })
    jsonApi.define('product', {
      title: ''
    })
    jsonApi.findAll('product').then((products)=> {
      expect(products[0].id).to.eql('1')
      expect(products[0].title).to.eql('Some Title')
      expect(products[1].id).to.eql('2')
      expect(products[1].title).to.eql('Another Title')
      done()
    }).catch(err => console.log(err))
  })

  it('should include meta information on response objects', (done)=> {
    mockResponse(jsonApi, {
      data: {
        meta: {
          totalObjects: 1
        },
        data: [{
          id: '1',
          type: 'products',
          attributes: {
            'title': 'Some Title'
          }
        }]
      }
    })
    jsonApi.define('product', {
      title: ''
    })
    jsonApi.findAll('product').then((products)=> {
      expect(products.meta.totalObjects).to.eql(1)
      expect(products[0].id).to.eql('1')
      expect(products[0].title).to.eql('Some Title')
      done()
    }).catch(err => console.log(err))
  })

})
