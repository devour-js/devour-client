'use strict';

var _ = require('lodash');
var pluralize = require('pluralize');

function collection(modelName, items) {
  var _this = this;

  return items.map(function (item) {
    return resource.call(_this, modelName, item);
  });
}

function resource(modelName, item) {
  var model = this.modelFor(modelName);
  var options = model.options || {};
  var readOnly = options.readOnly || [];
  var typeName = options.type || pluralize(modelName);
  var serializedAttributes = {};
  var serializedRelationships = {};
  var serializedResource = {};
  if (model.options.serializer) {
    return model.options.serializer.call(this, item);
  }
  _.forOwn(model.attributes, function (value, key) {
    if (isReadOnly(key, readOnly)) {
      return;
    }
    if (isRelationship(value)) {
      serializeRelationship(key, item[key], value, serializedRelationships);
    } else {
      serializedAttributes[key] = item[key];
    }
  });

  serializedResource.type = typeName;
  serializedResource.attributes = serializedAttributes;

  if (Object.keys(serializedRelationships).length > 0) {
    serializedResource.relationships = serializedRelationships;
  }

  if (item.id) {
    serializedResource.id = item.id;
  }
  return serializedResource;
}

function isReadOnly(attribute, readOnly) {
  return readOnly.indexOf(attribute) !== -1;
}

function isRelationship(attribute) {
  return _.isPlainObject(attribute) && _.includes(['hasOne', 'hasMany'], attribute.jsonApi);
}

function serializeRelationship(relationshipName, relationship, relationshipType, serializeRelationships) {
  if (relationshipType.jsonApi === 'hasMany' && relationship !== undefined) {
    serializeRelationships[relationshipName] = serializeHasMany(relationship, relationshipType.type);
  }
  if (relationshipType.jsonApi === 'hasOne' && relationship !== undefined) {
    serializeRelationships[relationshipName] = serializeHasOne(relationship, relationshipType.type);
  }
}

function serializeHasMany(relationships, type) {
  return {
    data: _.map(relationships, function (item) {
      return { id: item.id, type: type };
    })
  };
}

function serializeHasOne(relationship, type) {
  if (relationship === null) {
    return { data: null };
  }
  return {
    data: { id: relationship.id, type: type }
  };
}

module.exports = {
  resource: resource,
  collection: collection
};