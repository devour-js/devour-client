import JsonApi from '../../index'
import deserialize from '../../middleware/json-api/_deserialize'
import mockResponse from '../helpers/mock-response'
import expect from 'expect.js'

describe('deserialize', ()=> {

  afterEach(()=> {
    let jsonApi = JsonApi.getInstance()
    jsonApi.setup('http://myapi.com')
    jsonApi.resetMiddleware()
  })

  it('should deserialize single resource items', ()=> {
    let jsonApi = JsonApi.getInstance()
    jsonApi.setup('http://myapi.com')
    jsonApi.define('product', {
      title: '',
      about: ''
    })
    let mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          'title': 'Some Title',
          'about': 'Some about'
        }
      }
    }
    let product = deserialize.resource.call(jsonApi, mockResponse.data)
    expect(product.id).to.eql('1')
    expect(product.title).to.eql('Some Title')
    expect(product.about).to.eql('Some about')
  })

  it('should deserialize hasMany relations', ()=> {
    let jsonApi = JsonApi.getInstance()
    jsonApi.setup('http://myapi.com')
    jsonApi.define('product', {
      title: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    let mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              {id: '5', type: 'tags'},
              {id: '6', type: 'tags'}
            ]
          }
        }
      },
      included: [
        {id: '5', type: 'tags', attributes: {name: 'one'}},
        {id: '6', type: 'tags', attributes: {name: 'two'}}
      ]
    }
    let payload = {
      res: {
        data: mockResponse
      },
      jsonApi: jsonApi,
    }
    let product = deserialize.resource.call(jsonApi, mockResponse.data, mockResponse.included)
    expect(product.id).to.eql('1')
    expect(product.title).to.eql('hello')
    expect(product.tags).to.be.an('array')
    expect(product.tags[0].id).to.eql('5')
    expect(product.tags[0].name).to.eql('one')
    expect(product.tags[1].id).to.eql('6')
    expect(product.tags[1].name).to.eql('two')
  })

  it('should deserialize collections of resource items', ()=> {
    let jsonApi = JsonApi.getInstance()
    jsonApi.setup('http://myapi.com')
    jsonApi.define('product', {
      title: '',
      about: ''
    })
    let mockResponse = {
      data: [
        {
          id: '1',
          type: 'products',
          attributes: {
            title: 'Some Title',
            about: 'Some about'
          }
        },
        {
          id: '2',
          type: 'products',
          attributes: {
            title: 'Another Title',
            about: 'Another about'
          }
        }
      ]
    }
    let products = deserialize.collection.call(jsonApi, mockResponse.data)
    expect(products[0].id).to.eql('1')
    expect(products[0].title).to.eql('Some Title')
    expect(products[0].about).to.eql('Some about')
    expect(products[1].id).to.eql('2')
    expect(products[1].title).to.eql('Another Title')
    expect(products[1].about).to.eql('Another about')
  })

})
