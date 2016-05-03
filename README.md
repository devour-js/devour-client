# Devour JSON-API Client

– _"Don't just consume your [JSON-API](http://jsonapi.org/), Devour it"_

-------------------------------------------------

The [JSON API specification](http://jsonapi.org/format/) has given us a sensible convention to build our API's against. It's flexible, well thought out, and comes fully loaded with clear answers to questions like pagination, filtering, sparse fields, and relationships.

### Another Implementation?

While there are quite a few [JavaScript client implementations](http://jsonapi.org/implementations/#client-libraries-javascript), none of them appeared to offer the exact feature set we needed with the simplicity we required.

### Quick Start

```js
// Import
import JsonApi from 'devour-api-client'

// Bootstrap
let jsonApi = JsonApi.getInstance()
jsonApi.setup('http://your-api-here.com')

// Define Models
jsonApi.define('post', {
  title: '',
  content: '',
  tags: []
})

jsonApi.define('comment', {
  commentText: '',
  post: {
    jsonApi: 'hasOne',
    type: 'post'
  }
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
