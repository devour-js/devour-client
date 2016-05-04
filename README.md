# Devour JSON-API Client

– _"Don't just consume your [JSON-API](http://jsonapi.org/), Devour it"_

-------------------------------------------------

[![Build Status](https://travis-ci.org/twg/devour-jsonapi-client.svg?branch=master)](https://travis-ci.org/twg/devour-jsonapi-client)


The [JSON API specification](http://jsonapi.org/format/) has given us a sensible convention to build our API's against. It's flexible, well thought out, and comes fully loaded with clear answers to questions like pagination, filtering, sparse fields, and relationships.

While JSON API is amazing, it can be painful to work with if you don't have a good consumer library. It turns out that serializing and deserializing JSON API resources manually is quite painful. Enter Devour...

### Another Implementation?

While there are quite a few [JavaScript client implementations](http://jsonapi.org/implementations/#client-libraries-javascript), none of them appeared to offer the exact feature set we needed with the simplicity we required.

### Quick Start

```js
// npm install devour-api-client --save

// Import
import JsonApi from 'devour-api-client'

// Bootstrap
const jsonApi = new JsonApi('http://your-api-here.com')

// Define Model
jsonApi.define('post', {
  title: '',
  content: '',
  tags: []
})

// To find many...
jsonApi.findAll('post')

// To find many with filters...
jsonApi.findAll('post', {page: {number: 2}})

// To find one...
jsonApi.find('post', 5)

// To create...
jsonApi.create('post', {
  title: 'hello',
  content: 'some content',
  tags: ['one', 'two']
})

// To update...
jsonApi.update('post', {
  id: 5,
  title: 'new title',
  content: 'new content',
  tags: ['new tag']
})

// To destroy...
jsonApi.destroy('post', 5)
```

### Relationships

Devour comes stock with an easy way of defining relationships which can be included when hitting your API.

```js
jsonApi.define('post', {
  title: '',
  content: '',
  comments: {
    jsonApi: 'hasMany',
    type: 'comments'
  }
})

jsonApi.define('comment', {
  comment: ''
})

let post = jsonApi.findAll('post', {include: 'comments'})
// => post.comment will be populated with any comments included by your API
```

### Flexibility

Devour uses a fully middleware based approach. This allows you to easily manipulate any part of the request and response cycle by injecting your own middleware. In fact, it's entirely possible to fully remove our default middleware and write your own. Moving forward we hope to see adapters for different server implementations. If you'd like to take a closer look at the middleware layer, please checkout:

* The [index.js file](https://github.com/twg/devour-jsonapi-client/blob/master/index.js#L8) where we construct our default middleware stack
* The middleware folder that contains all our default [JSON API middleware](https://github.com/twg/devour-jsonapi-client/tree/master/middleware/json-api)

### Your First Middleware

Adding your own middleware is easy. It's just a simple JavaScript object that has a `name`, `req`, and/or `res` property. The `req` or `res` property is a function that receives a `payload`, which houses all the details of the request cycle _(inspect it for yourself to learn more)_. For async operations, your `req` or `res` methods can return a promise, which will need to resolve before the middleware chain continues. Otherwise, you may just manipulate the `payload` as needed and return it immediately.

```js
let requestMiddleware = {
  name: 'add-cats-to-request',
  req: (payload)=> {
    if(payload.req.method === 'GET') {
      payload.req.cats = 'more-cats'
    }
    return payload
  }
}

let responseMiddleware = {
  name: 'only-cats-please',
  res: (payload) => {
    payload.res.data = ['Cats', 'Cats', 'Cats']
    return payload
  }
}

jsonApi.insertMiddlewareBefore('axios-request', requestMiddleware)
jsonApi.insertMiddlewareAfter('response', responseMiddleware)
```

### Options

When declaring a model you may pass in a few extra options. We will likely expand these options as we find new and interesting requirements.

```js
jsonApi.define('product', {
  title: '',
  description: ''
  price: ''
}, {
  readOnly: ['price'],
  collectionPath: 'awesome-products',
  serializer: (rawItem)=> {
    return {customStuff: true}
  }
})
```

There are also a few options we can set on the `jsonApi` instance directly. For example:

```js
// Append headers to every request
jsonApi.headers['my-auth-token'] = 'xxxxx-xxxxx'
// Replace the default middleware stack with your own
jsonApi.middleware = [{...}, {...}, {...}]
// Change the apiUrl
jsonApi.apiUrl = 'http://api.yoursite.com'
```
