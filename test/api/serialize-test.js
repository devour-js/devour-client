/* global describe, it, beforeEach */

import JsonApi from '../../src/index'
import serialize from '../../src/middleware/json-api/_serialize'
import expect from 'expect.js'

describe('serialize', () => {
  var jsonApi = null
  beforeEach(() => {
    jsonApi = new JsonApi({apiUrl: 'http://myapi.com'})
  })

  it('should not serialize undefined attributes', () => {
    jsonApi.define('product', {
      title: '',
      about: ''
    })
    let serializedItem = serialize.resource.call(jsonApi, 'product', {title: undefined, about: undefined})
    expect(serializedItem.attributes).to.eql(undefined)
  })

  it('should serialize resource items', () => {
    jsonApi.define('product', {
      title: '',
      about: ''
    })
    let serializedItem = serialize.resource.call(jsonApi, 'product', {title: 'Hello', about: 'World'})
    expect(serializedItem.type).to.eql('products')
    expect(serializedItem.attributes.title).to.eql('Hello')
    expect(serializedItem.attributes.about).to.eql('World')
  })

  it('should serialize hasMany relationships', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    let product = {
      title: 'hello',
      about: 'relationships',
      tags: [
        {id: 1, name: 'red'},
        {id: 2, name: 'green'},
        {id: 3, name: 'blue'}
      ]
    }
    let serializedItem = serialize.resource.call(jsonApi, 'product', product)
    expect(serializedItem.relationships.tags.data[0].id).to.eql(1)
    expect(serializedItem.relationships.tags.data[0].type).to.eql('tags')
    expect(serializedItem.relationships.tags.data[1].id).to.eql(2)
    expect(serializedItem.relationships.tags.data[1].type).to.eql('tags')
    expect(serializedItem.relationships.tags.data[2].id).to.eql(3)
    expect(serializedItem.relationships.tags.data[2].type).to.eql('tags')
  })

  it('should not serialize omitted relationships', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      },
      category: {
        jsonApi: 'hasOne',
        type: 'categories'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    jsonApi.define('category', {
      name: ''
    })

    let product = {
      title: 'hello',
      about: 'relationships',
      tags: [
        {id: 1, name: 'red'}
      ]
    }
    let serializedItem = serialize.resource.call(jsonApi, 'product', product)
    expect(serializedItem).to.have.property('relationships')
    expect(serializedItem.relationships.tags.data).to.be.an('array')
    expect(serializedItem.relationships.tags.data[0].id).to.eql(1)
    expect(serializedItem.relationships.tags.data[0].type).to.eql('tags')

    expect(serializedItem.relationships).to.not.have.property('category')
  })

  it('should omit the relationship object if none are specified', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })

    let product = {
      title: 'hello',
      about: 'relationships'
    }

    let serializedItem = serialize.resource.call(jsonApi, 'product', product)
    expect(serializedItem).not.to.have.property('relationships')
  })

  it('should serialize null hasOne relationships', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      },
      category: {
        jsonApi: 'hasOne',
        type: 'categories'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    jsonApi.define('category', {
      name: ''
    })

    let product = {
      title: 'hello',
      about: 'relationships',
      category: null
    }
    let serializedItem = serialize.resource.call(jsonApi, 'product', product)
    expect(serializedItem).to.have.property('relationships')
    expect(serializedItem.relationships.category.data).to.eql(null)
  })

  it('should serialize empty hasMany relationships', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      },
      category: {
        jsonApi: 'hasOne',
        type: 'categories'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    jsonApi.define('category', {
      name: ''
    })

    let product = {
      title: 'hello',
      about: 'relationships',
      tags: []
    }
    let serializedItem = serialize.resource.call(jsonApi, 'product', product)
    expect(serializedItem).to.have.property('relationships')
    expect(serializedItem.relationships.tags.data).to.be.an('array')
    expect(serializedItem.relationships.tags.data.length).to.eql(0)
  })

  it('should serialize hasOne relationships', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      tags: {
        jsonApi: 'hasOne',
        type: 'tags'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    let product = {
      title: 'hello',
      about: 'relationships',
      tags: {id: 1, name: 'red'}
    }
    let serializedItem = serialize.resource.call(jsonApi, 'product', product)
    expect(serializedItem.relationships.tags.data.id).to.eql(1)
    expect(serializedItem.relationships.tags.data.type).to.eql('tags')
  })

  it('should not serialize read only attributes', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      url: '',
      anotherReadOnly: {
        test: 'hello'
      }
    }, {
      readOnly: ['url', 'anotherReadOnly']
    })
    let serializedItem = serialize.resource.call(jsonApi, 'product', {title: 'Hello', about: 'World', url: 'something'})
    expect(serializedItem.type).to.eql('products')
    expect(serializedItem.attributes.title).to.eql('Hello')
    expect(serializedItem.attributes.about).to.eql('World')
    expect(serializedItem.attributes.url).to.be(undefined)
    expect(serializedItem.attributes.anotherReadOnly).to.be(undefined)
  })

  it('should serialize collections of items', () => {
    jsonApi.define('product', {
      title: '',
      about: ''
    })
    let serializedItems = serialize.collection.call(jsonApi, 'product', [
      {title: 'hello', about: 'one'}, {title: 'goodbye', about: 'two'}
    ])
    expect(serializedItems[0].type).to.eql('products')
    expect(serializedItems[1].type).to.eql('products')
    expect(serializedItems[0].attributes.title).to.eql('hello')
    expect(serializedItems[1].attributes.title).to.eql('goodbye')
    expect(serializedItems[0].attributes.about).to.eql('one')
    expect(serializedItems[1].attributes.about).to.eql('two')
  })

  it('should serialize the id of items if present', () => {
    jsonApi.define('product', {title: ''})
    let serializedItem = serialize.resource.call(jsonApi, 'product', {id: '5', title: 'Hello'})
    expect(serializedItem.type).to.eql('products')
    expect(serializedItem.id).to.eql('5')
  })

  it('should serialize meta on resource if present', () => {
    jsonApi.define('product', {title: ''})
    let serializedItem = serialize.resource.call(jsonApi, 'product', {id: '5', title: 'Hello', meta: {customStuff: 'More custom stuff'}})
    expect(serializedItem.type).to.eql('products')
    expect(serializedItem.meta.customStuff).to.eql('More custom stuff')
  })

  it('should serialize links on resource if present', () => {
    jsonApi.define('product', {title: ''})
    let serializedItem = serialize.resource.call(jsonApi, 'product', {id: '5', title: 'Hello', links: {self: 'http://example.com/products'}})
    expect(serializedItem.type).to.eql('products')
    expect(serializedItem.links.self).to.eql('http://example.com/products')
  })

  it('should allow for custom serialization if present on the model', () => {
    jsonApi.define('product', {title: ''}, {
      serializer: () => {
        return {
          custom: true
        }
      }
    })
    let serializedItem = serialize.resource.call(jsonApi, 'product', {id: '5', title: 'Hello'})
    expect(serializedItem.custom).to.eql(true)
  })

  it('should serialize polymorphic hasOne relationships', () => {
    jsonApi.define('order', {
      title: '',
      payable: {
        jsonApi: 'hasOne'
      }
    })

    let serializedItem = serialize.resource.call(jsonApi, 'order', {id: '5', title: 'Hello', payable: {id: 4, type: 'subtotal'}})
    expect(serializedItem.type).to.eql('orders')
    expect(serializedItem.attributes.title).to.eql('Hello')
    expect(serializedItem.relationships.payable.data.id).to.eql(4)
    expect(serializedItem.relationships.payable.data.type).to.eql('subtotal')
  })

  it('should serialize polymorphic hasMany relationships', () => {
    jsonApi.define('order', {
      title: '',
      payables: {
        jsonApi: 'hasMany'
      }
    })

    let serializedItem = serialize.resource.call(jsonApi, 'order', {id: '5', title: 'Hello', payables: [{id: 4, type: 'subtotal'}, {id: 4, type: 'tax'}]})
    expect(serializedItem.type).to.eql('orders')
    expect(serializedItem.attributes.title).to.eql('Hello')
    expect(serializedItem.relationships.payables.data[0].id).to.eql(4)
    expect(serializedItem.relationships.payables.data[0].type).to.eql('subtotal')
    expect(serializedItem.relationships.payables.data[1].id).to.eql(4)
    expect(serializedItem.relationships.payables.data[1].type).to.eql('tax')
  })
})
