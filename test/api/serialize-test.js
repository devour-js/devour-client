/* global describe, it, beforeEach */

import JsonApi from '../../src/index'
import serialize from '../../src/middleware/json-api/_serialize'
import expect from 'expect.js'

describe('serialize', () => {
  var jsonApi = null
  beforeEach(() => {
    jsonApi = new JsonApi({apiUrl: 'http://myapi.com'})
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
})
