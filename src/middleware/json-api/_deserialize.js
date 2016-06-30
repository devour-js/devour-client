const _ = require('lodash')
const pluralize = require('pluralize')

function collection (items, included, responseModel) {
  return items.map(item => {
    return resource.call(this, item, included, responseModel)
  })
}

function resource (item, included, responseModel) {
  let model = this.modelFor(pluralize.singular(item.type))
  if (!model) {
    throw new Error('The JSON API response had a type of "' + item.type + '" but Devour expected the type to be "' + responseModel + '".')
  }

  if (model.options.deserializer) {
    return model.options.deserializer.call(this, item)
  }

  let deserializedModel = {}
  if (item.id) {
    deserializedModel.id = item.id
  }

  if (item.type) {
    deserializedModel.type = item.type
  }

  _.forOwn(model.attributes, (value, key) => {
    if (isRelationship(value)) {
      deserializedModel[key] = attachRelationsFor.call(this, model, value, item, included, key)
    } else if (item.attributes) {
      deserializedModel[key] = item.attributes[key]
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
    return resource.call(this, relatedItems[0], included)
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
    return collection.call(this, relatedItems, included)
  }
  return []
}

function isRelationship (attribute) {
  return (_.isPlainObject(attribute) && _.includes(['hasOne', 'hasMany'], attribute.jsonApi))
}

/*
 *   == relatedItemsFor
 *   Returns unserialized related items.
 */
function relatedItemsFor (model, attribute, item, included, key) {
  let relationMap = _.get(item.relationships, [key, 'data'], false)
  if (!relationMap) {
    return []
  }

  if (_.isArray(relationMap)) {
    return _.flatten(_.map(relationMap, function (relationMapItem) {
      return _.filter(included, (includedItem) => {
        return isRelatedItemFor(attribute, includedItem, relationMapItem)
      })
    }))
  } else {
    return _.filter(included, (includedItem) => {
      return isRelatedItemFor(attribute, includedItem, relationMap)
    })
  }
}

function isRelatedItemFor (attribute, relatedItem, relationMapItem) {
  let passesFilter = true
  if (attribute.filter) {
    passesFilter = _.matches(relatedItem.attributes, attribute.filter)
  }
  return (
    relatedItem.id === relationMapItem.id &&
    relatedItem.type === relationMapItem.type &&
    passesFilter
  )
}

module.exports = {
  resource: resource,
  collection: collection
}
