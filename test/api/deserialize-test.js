/* global describe, it, before */
/* eslint-disable no-unused-expressions */

import JsonApi from '../../src/index'
import deserialize from '../../src/middleware/json-api/_deserialize'
import expect from 'expect.js'

describe('deserialize', () => {
  let jsonApi = null
  before(() => {
    jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' })
  })

  it('should deserialize single resource items', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      kebabCaseDescription: ''
    })
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'Some Title',
          about: 'Some about',
          'kebab-case-description': 'Lorem ipsum'
        },
        meta: {
          info: 'Some meta data'
        },
        links: {
          arbitrary: 'arbitrary link'
        }
      }
    }
    const product = deserialize.resource.call(jsonApi, mockResponse.data)
    expect(product.id).to.eql('1')
    expect(product.type).to.eql('products')
    expect(product.title).to.eql('Some Title')
    expect(product.about).to.eql('Some about')
    expect(product.kebabCaseDescription).to.eql('Lorem ipsum')
    expect(product.meta.info).to.eql('Some meta data')
    expect(product.links.arbitrary).to.eql('arbitrary link')
  })

  it('should deserialize hasMany relations', () => {
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
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              { id: '5', type: 'tags' },
              { id: '6', type: 'tags' }
            ]
          }
        }
      },
      included: [
        { id: '5', type: 'tags', attributes: { name: 'one' } },
        { id: '6', type: 'tags', attributes: { name: 'two' } }
      ]
    }
    const product = deserialize.resource.call(jsonApi, mockResponse.data, mockResponse.included)
    expect(product.id).to.eql('1')
    expect(product.type).to.eql('products')
    expect(product.title).to.eql('hello')
    expect(product.tags).to.be.an('array')
    expect(product.tags[0].id).to.eql('5')
    expect(product.tags[0].type).to.eql('tags')
    expect(product.tags[0].name).to.eql('one')
    expect(product.tags[1].id).to.eql('6')
    expect(product.tags[1].type).to.eql('tags')
    expect(product.tags[1].name).to.eql('two')
  })

  it('should deserialize complex relations without going into an infinite loop', () => {
    jsonApi.define('course', {
      title: '',
      instructor: {
        jsonApi: 'hasOne',
        type: 'instructors'
      },
      lessons: {
        jsonApi: 'hasMany',
        type: 'lessons'
      }
    })
    jsonApi.define('lesson', {
      title: '',
      course: {
        jsonApi: 'hasOne',
        type: 'courses'
      },
      instructor: {
        jsonApi: 'hasOne',
        type: 'instructors'
      }
    })
    jsonApi.define('instructor', {
      name: '',
      lessons: {
        jsonApi: 'hasMany',
        type: 'lessons'
      }
    })

    const mockResponse = {
      data: {
        id: '1',
        type: 'courses',
        attributes: {
          title: 'hello'
        },
        relationships: {
          lessons: {
            data: [
              {
                id: '42',
                type: 'lessons'
              },
              {
                id: '43',
                type: 'lessons'
              }
            ]
          },
          instructor: {
            data: {
              id: '5',
              type: 'instructors'
            }
          }
        }
      },
      included: [
        {
          id: '42',
          type: 'lessons',
          attributes: { title: 'sp-one' },
          relationships: {
            course: {
              data: {
                id: '1',
                type: 'courses'
              }
            },
            instructor: {
              data: {
                id: '5',
                type: 'instructors'
              }
            }
          }
        },
        {
          id: '43',
          type: 'lessons',
          attributes: { title: 'sp-two' },
          relationships: {
            course: {
              data: {
                id: '1',
                type: 'courses'
              }
            },
            instructor: {
              data: {
                id: '5',
                type: 'instructors'
              }
            }
          }
        },
        {
          id: '5',
          type: 'instructors',
          attributes: { name: 'instructor one' },
          relationships: {
            lessons: {
              data: [
                {
                  id: '42',
                  type: 'lessons'
                },
                {
                  id: '43',
                  type: 'lessons'
                }
              ]
            }
          }
        }
      ]
    }
    const course = deserialize.resource.call(jsonApi, mockResponse.data, mockResponse.included)
    expect(course.id).to.eql('1')
    expect(course.instructor.type).to.eql('instructors')
    expect(course.instructor.lessons).to.be.an('array')
    expect(course.instructor.lessons.length).to.equal(2)
    expect(course.lessons).to.be.an('array')
    expect(course.lessons.length).to.equal(2)
    expect(course.lessons[0].type).to.eql('lessons')
    expect(course.lessons[0].id).to.eql('42')
    expect(course.lessons[0].instructor.id).to.eql('5')
    expect(course.lessons[1].type).to.eql('lessons')
    expect(course.lessons[1].id).to.eql('43')
    expect(course.lessons[1].instructor.id).to.eql('5')
  })

  it('should deserialize collections of resource items', () => {
    jsonApi.define('product', {
      title: '',
      about: ''
    })
    const mockResponse = {
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
    const products = deserialize.collection.call(jsonApi, mockResponse.data)
    expect(products[0].id).to.eql('1')
    expect(products[0].type).to.eql('products')
    expect(products[0].title).to.eql('Some Title')
    expect(products[0].about).to.eql('Some about')
    expect(products[1].id).to.eql('2')
    expect(products[1].type).to.eql('products')
    expect(products[1].title).to.eql('Another Title')
    expect(products[1].about).to.eql('Another about')
  })

  it('should allow for custom deserialization if present on the resource definition', () => {
    jsonApi.define('product', { title: '' }, {
      deserializer: (rawItem) => {
        return {
          custom: true
        }
      }
    })
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'Some Title',
          about: 'Some about'
        }
      }
    }
    const product = deserialize.resource.call(jsonApi, mockResponse.data)
    expect(product.custom).to.eql(true)
  })

  it('uses custom deserialization for each resource in a collection', () => {
    jsonApi.define('product', { title: '' }, {
      deserializer: () => {
        return {
          custom: true
        }
      }
    })
    const mockResponse = {
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
    const products = deserialize.collection.call(jsonApi, mockResponse.data)
    expect(products[0].custom).to.eql(true)
    expect(products[1].custom).to.eql(true)
  })

  it('should deserialize resources in data without attributes', () => {
    jsonApi.define('product', {
      title: '',
      about: ''
    })
    const mockResponse = {
      data: [
        {
          id: '1',
          type: 'products'
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
    const products = deserialize.collection.call(jsonApi, mockResponse.data)
    expect(products[0].title).to.be.undefined
    expect(products[0].about).to.be.undefined
    expect(products[1].title).to.be.eql('Another Title')
    expect(products[1].about).to.be.eql('Another about')
  })

  it('should deserialize resources in include without attributes', () => {
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
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              { id: '5', type: 'tags' },
              { id: '6', type: 'tags' }
            ]
          }
        }
      },
      included: [
        { id: '5', type: 'tags' },
        { id: '6', type: 'tags', attributes: { name: 'two' } }
      ]
    }
    const product = deserialize.resource.call(jsonApi, mockResponse.data, mockResponse.included)
    expect(product.id).to.eql('1')
    expect(product.title).to.eql('hello')
    expect(product.tags).to.be.an('array')
    expect(product.tags[0].id).to.eql('5')
    expect(product.tags[0].name).to.be.undefined
    expect(product.tags[1].id).to.eql('6')
    expect(product.tags[1].name).to.eql('two')
  })

  it('should deserialize types and ids of related resources that are not included', () => {
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
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              { id: '5', type: 'tags' },
              { id: '6', type: 'tags' }
            ]
          }
        }
      }
    }
    const product = deserialize.resource.call(jsonApi, mockResponse.data)
    expect(product.id).to.eql('1')
    expect(product.title).to.eql('hello')
    expect(product.tags).to.be.an('array')
    expect(product.tags.length).to.be(2)

    expect(product.tags[0]).to.be.an('object')
    expect(product.tags[0].id).to.eql('5')
    expect(product.tags[0].type).to.eql('tags')

    expect(product.tags[1]).to.be.an('object')
    expect(product.tags[1].id).to.eql('6')
    expect(product.tags[1].type).to.eql('tags')
  })

  it('should not include relationship data on unresolved hasMany relationships if attachRelationshipDataOnUnresolvedIncludes flag is set to false', () => {
    jsonApi = new JsonApi({
      apiUrl: 'http://myapi.com',
      attachRelationshipDataOnUnresolvedIncludes: false
    })
    jsonApi.define('product', {
      title: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tag'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              { id: '5', type: 'tags' },
              { id: '6', type: 'tags' }
            ]
          }
        }
      }
    }
    const product = deserialize.resource.call(jsonApi, mockResponse.data, mockResponse.included)
    expect(product.id).to.eql('1')
    expect(product.type).to.eql('products')
    expect(product.title).to.eql('hello')
    expect(product.tags).to.be.an('array')
    expect(product.tags).to.be.empty()
  })

  it('should not include relationship data on unresolved hasOne relationships if attachRelationshipDataOnUnresolvedIncludes flag is set to false', () => {
    jsonApi = new JsonApi({
      apiUrl: 'http://myapi.com',
      attachRelationshipDataOnUnresolvedIncludes: false
    })
    jsonApi.define('product', {
      title: '',
      tag: {
        jsonApi: 'hasOne',
        type: 'tag'
      }
    })
    jsonApi.define('tag', {
      name: ''
    })
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tag: {
            data: { id: '5', type: 'tag' }
          }
        }
      }
    }
    const product = deserialize.resource.call(jsonApi, mockResponse.data, mockResponse.included)
    expect(product.id).to.eql('1')
    expect(product.type).to.eql('products')
    expect(product.title).to.eql('hello')
    expect(product.tag).to.not.be.an('array')
    expect(product.tag).to.eql(null)
  })
})
