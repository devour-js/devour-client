const _forOwn = require('lodash/forOwn')
const _isArray = require('lodash/isArray')
const _isUndefined = require('lodash/isUndefined')
const _isPlainObject = require('lodash/isPlainObject')
const _includes = require('lodash/includes')
const _find = require('lodash/find')
const _get = require('lodash/get')
const _map = require('lodash/map')
const _filter = require('lodash/filter')
const _matches = require('lodash/matches')
const _flatten = require('lodash/flatten')

const Logger = require('../../logger')

const cache = new class {
  constructor () { this._cache = [] }

  set (type, id, deserializedData) {
    this._cache.push({
      type: type,
      id: id,
      deserialized: deserializedData
    })
  }

  get (type, id) {
    const match = _find(this._cache, r => r.type === type && r.id === id)
    return match && match.deserialized
  }

  clear () {
    this._cache = []
  }
}

function collection (items, included, useCache = false) {
  const collection = items.map(item => {
    return resource.call(this, item, included, useCache)
  })

  cache.clear()

  return collection
}

function resource (item, included, useCache = false) {
  if (useCache) {
    const cachedItem = cache.get(item.type, item.id)
    if (cachedItem) return cachedItem
  }

  let model = this.modelFor(this.pluralize.singular(item.type))
  if (model.options.deserializer) return model.options.deserializer.call(this, item, included)

  let deserializedModel = {id: item.id, type: item.type}

  _forOwn(item.attributes, (value, attr) => {
    var attrConfig = model.attributes[attr]

    if (_isUndefined(attrConfig) && attr !== 'id') {
      attr = attr.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase() })
      attrConfig = model.attributes[attr]
    }

    if (_isUndefined(attrConfig) && attr !== 'id') {
      Logger.warn(`Resource response for type "${item.type}" contains attribute "${attr}", but it is not present on model config and therefore not deserialized.`)
    } else {
      deserializedModel[attr] = value
    }
  })

  // Important: cache before parsing relationships to avoid infinite loop
  cache.set(item.type, item.id, deserializedModel)

  _forOwn(item.relationships, (value, rel) => {
    var relConfig = model.attributes[rel]
    var key = rel

    if (_isUndefined(relConfig)) {
      rel = rel.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase() })
      relConfig = model.attributes[rel]
    }

    if (_isUndefined(relConfig)) {
      Logger.warn(`Resource response for type "${item.type}" contains relationship "${rel}", but it is not present on model config and therefore not deserialized.`)
    } else if (!isRelationship(relConfig)) {
      Logger.warn(`Resource response for type "${item.type}" contains relationship "${rel}", but it is present on model config as a plain attribute.`)
    } else {
      deserializedModel[rel] =
        attachRelationsFor.call(this, model, relConfig, item, included, key)
    }
  })

  var params = ['meta', 'links']
  params.forEach(function (param) {
    if (item[param]) {
      deserializedModel[param] = item[param]
    }
  })

  return deserializedModel
}

function attachRelationsFor (model, attribute, item, included, key) {
  let relation = null
  if (attribute.jsonApi === 'hasOne') {
    relation = attachHasOneFor.call(this, model, attribute, item, included, key)
  }
  if (attribute.jsonApi === 'hasMany') {
    relation = attachHasManyFor.call(this, model, attribute, item, included, key)
  }
  return relation
}

function attachHasOneFor (model, attribute, item, included, key) {
  if (!item.relationships) {
    return null
  }

  let relatedItems = relatedItemsFor(model, attribute, item, included, key)
  if (relatedItems && relatedItems[0]) {
    return resource.call(this, relatedItems[0], included, true)
  } else {
    return null
  }
}

function attachHasManyFor (model, attribute, item, included, key) {
  if (!item.relationships) {
    return null
  }
  let relatedItems = relatedItemsFor(model, attribute, item, included, key)
  if (relatedItems && relatedItems.length > 0) {
    return collection.call(this, relatedItems, included, true)
  }
  return []
}

function isRelationship (attribute) {
  return (_isPlainObject(attribute) && _includes(['hasOne', 'hasMany'], attribute.jsonApi))
}

/*
 *   == relatedItemsFor
 *   Returns unserialized related items.
 */
function relatedItemsFor (model, attribute, item, included, key) {
  let relationMap = _get(item.relationships, [key, 'data'], false)
  if (!relationMap) {
    return []
  }

  if (_isArray(relationMap)) {
    return _flatten(_map(relationMap, function (relationMapItem) {
      return _filter(included, (includedItem) => {
        return isRelatedItemFor(attribute, includedItem, relationMapItem)
      })
    }))
  } else {
    return _filter(included, (includedItem) => {
      return isRelatedItemFor(attribute, includedItem, relationMap)
    })
  }
}

function isRelatedItemFor (attribute, relatedItem, relationMapItem) {
  let passesFilter = true
  if (attribute.filter) {
    passesFilter = _matches(relatedItem.attributes, attribute.filter)
  }
  return (
    relatedItem.id === relationMapItem.id &&
    relatedItem.type === relationMapItem.type &&
    passesFilter
  )
}

module.exports = {
  cache: cache,
  resource: resource,
  collection: collection
}
