import JsonApi from '../../index'
import mockResponse from '../helpers/mock-response'
import expect from 'expect.js'

let Context = {
  jsonApi: null
}

describe('JsonApi', ()=> {

  beforeEach(()=> {
    Context.jsonApi = JsonApi.getInstance()
    Context.jsonApi.setup('http://myapi.com')
    Context.jsonApi.resetMiddleware()
  })

  it('should set the apiUrl during setup', ()=> {
    expect(Context.jsonApi.apiUrl).to.eql('http://myapi.com')
  })

  it('should expose the serialize and deserialize objects', ()=> {
    expect(Context.jsonApi.serialize.collection).to.be.a('function')
    expect(Context.jsonApi.serialize.resource).to.be.a('function')
    expect(Context.jsonApi.deserialize.collection).to.be.a('function')
    expect(Context.jsonApi.deserialize.resource).to.be.a('function')

  })

  it('should have a empty models and middleware properties after instantiation', ()=> {
    expect(Context.jsonApi.models).to.be.an('object')
    expect(Context.jsonApi.middleware).to.be.an('array')
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
    Context.jsonApi.middleware.unshift(catMiddleWare)
    expect(Context.jsonApi.middleware[0].name).to.eql('cat-middleware')
  })

  it('should initialize with an empty headers object', ()=> {
    expect(Context.jsonApi.headers).to.be.an('object')
    expect(Context.jsonApi.headers).to.eql({})
  })

  it('should allow users to add headers', ()=> {
    Context.jsonApi.headers['A-Header-Name'] = 'a value'
    expect(Context.jsonApi.headers).to.eql({
      'A-Header-Name':'a value'
    })
  })

  it('should allow users to register middleware before or after existing middleware', ()=> {
    let responseMiddleware = Context.jsonApi.middleware.filter(middleware => middleware.name === 'response')[0]
    let beforeMiddleware = {
      name: 'before'
    }
    let afterMiddleware = {
      name: 'after'
    }
    let index = Context.jsonApi.middleware.indexOf(responseMiddleware)
    Context.jsonApi.insertMiddlewareBefore('response', beforeMiddleware)
    Context.jsonApi.insertMiddlewareAfter('response', afterMiddleware)
    expect(Context.jsonApi.middleware.indexOf(beforeMiddleware)).to.eql(index)
    expect(Context.jsonApi.middleware.indexOf(afterMiddleware)).to.eql(index + 2)
  })

  it('should allow users to define models', ()=> {
    Context.jsonApi.define('product', {
      id:    '',
      title: ''
    })
    expect(Context.jsonApi.models['product']).to.be.an('object')
    expect(Context.jsonApi.models['product']['attributes']).to.have.key('id')
    expect(Context.jsonApi.models['product']['attributes']).to.have.key('title')
  })

  it('should construct collection paths for models', ()=> {
    Context.jsonApi.define('product', {})
    expect(Context.jsonApi.collectionPathFor('product')).to.eql('products')
  })

  it('should allow overrides for collection paths', ()=> {
    Context.jsonApi.define('product', {}, {collectionPath: 'my-products'})
    expect(Context.jsonApi.collectionPathFor('product')).to.eql('my-products')
  })

  it('should construct single resource paths for models', ()=> {
    Context.jsonApi.define('product', {})
    expect(Context.jsonApi.resourcePathFor('product', 1)).to.eql('products/1')
  })

  it('should construct collection urls for models', ()=> {
    Context.jsonApi.define('product', {})
    expect(Context.jsonApi.collectionUrlFor('product')).to.eql('http://myapi.com/products')
  })

  it('should construct single resource urls for models', ()=> {
    Context.jsonApi.define('product', {})
    expect(Context.jsonApi.resourceUrlFor('product', 1)).to.eql('http://myapi.com/products/1')
  })

  it('should make basic find calls', (done)=> {
    mockResponse(Context.jsonApi, {
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
    Context.jsonApi.define('product', {
      title: ''
    })
    Context.jsonApi.find('product', 1).then((product)=> {
      expect(product.id).to.eql('1')
      expect(product.title).to.eql('Some Title')
      done()
    }).catch(err => console.log(err))
  })

  it('should make basic findAll calls', (done)=> {
    mockResponse(Context.jsonApi, {
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
    Context.jsonApi.define('product', {
      title: ''
    })
    Context.jsonApi.findAll('product').then((products)=> {
      expect(products[0].id).to.eql('1')
      expect(products[0].title).to.eql('Some Title')
      expect(products[1].id).to.eql('2')
      expect(products[1].title).to.eql('Another Title')
      done()
    }).catch(err => console.log(err))
  })

  it('should include meta information on response objects', (done)=> {
    mockResponse(Context.jsonApi, {
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
    Context.jsonApi.define('product', {
      title: ''
    })
    Context.jsonApi.findAll('product').then((products)=> {
      expect(products.meta.totalObjects).to.eql(1)
      expect(products[0].id).to.eql('1')
      expect(products[0].title).to.eql('Some Title')
      done()
    }).catch(err => console.log(err))
  })

})
