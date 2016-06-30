'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var pluralize = require('pluralize');

var cache = new (function () {
  function _class() {
    _classCallCheck(this, _class);

    this._cache = [];
  }

  _createClass(_class, [{
    key: 'set',
    value: function set(type, id, deserializedData) {
      this._cache.push({
        type: type,
        id: id,
        deserialized: deserializedData
      });
    }
  }, {
    key: 'get',
    value: function get(type, id) {
      var match = _.find(this._cache, function (r) {
        return r.type === type && r.id === id;
      });
      return match && match.deserialized;
    }
  }]);

  return _class;
}())();

function collection(items, included, responseModel) {
  var _this = this;

  var useCache = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

  return items.map(function (item) {
    return resource.call(_this, item, included, responseModel, useCache);
  });
}

function resource(item, included, responseModel) {
  var _this2 = this;

  var useCache = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

  if (useCache) {
    var cachedItem = cache.get(item.type, item.id);
    if (cachedItem) return cachedItem;
  }

  var model = this.modelFor(pluralize.singular(item.type));
  if (!model) throw new Error('The JSON API response had a type of "' + item.type + '" but Devour expected the type to be "' + responseModel + '".');

  if (model.options.deserializer) return model.options.deserializer.call(this, item);

  var deserializedModel = { id: item.id };

  _.forOwn(item.attributes, function (value, attr) {
    var attrConfig = model.attributes[attr];

    if (_.isUndefined(attrConfig) && attr !== "id") {
      console.warn('Resource response contains attribute "' + attr + '", but it is not present on model config and therefore not deserialized.');
    } else {
      deserializedModel[attr] = value;
    }
  });

  // Important: cache before parsing relationships to avoid infinite loop
  cache.set(item.type, item.id, deserializedModel);

  _.forOwn(item.relationships, function (value, rel) {
    var relConfig = model.attributes[rel];

    if (_.isUndefined(relConfig)) console.warn('Resource response contains relationship "' + rel + '", but it is not present on model config and therefore not deserialized.');else if (!isRelationship(relConfig)) console.warn('Resource response contains relationship "' + rel + '", but it is present on model config as a plain attribute.');else deserializedModel[rel] = attachRelationsFor.call(_this2, model, relConfig, item, included, rel);
  });

  var params = ['meta', 'links'];
  params.forEach(function (param) {
    if (item[param]) {
      deserializedModel[param] = item[param];
    }
  });

  cache.set(item.type, item.id, deserializedModel);

  return deserializedModel;
}

function attachRelationsFor(model, attribute, item, included, key) {
  var relation = null;
  if (attribute.jsonApi === 'hasOne') {
    relation = attachHasOneFor.call(this, model, attribute, item, included, key);
  }
  if (attribute.jsonApi === 'hasMany') {
    relation = attachHasManyFor.call(this, model, attribute, item, included, key);
  }
  return relation;
}

function attachHasOneFor(model, attribute, item, included, key) {
  if (!item.relationships) {
    return null;
  }

  var relatedItems = relatedItemsFor(model, attribute, item, included, key);
  if (relatedItems && relatedItems[0]) {
    return resource.call(this, relatedItems[0], included, undefined, true);
  } else {
    return null;
  }
}

function attachHasManyFor(model, attribute, item, included, key) {
  if (!item.relationships) {
    return null;
  }
  var relatedItems = relatedItemsFor(model, attribute, item, included, key);
  if (relatedItems && relatedItems.length > 0) {
    return collection.call(this, relatedItems, included, undefined, true);
  }
  return [];
}

function isRelationship(attribute) {
  return _.isPlainObject(attribute) && _.includes(['hasOne', 'hasMany'], attribute.jsonApi);
}

/*
 *   == relatedItemsFor
 *   Returns unserialized related items.
 */
function relatedItemsFor(model, attribute, item, included, key) {
  var relationMap = _.get(item.relationships, [key, 'data'], false);
  if (!relationMap) {
    return [];
  }

  if (_.isArray(relationMap)) {
    return _.flatten(_.map(relationMap, function (relationMapItem) {
      return _.filter(included, function (includedItem) {
        return isRelatedItemFor(attribute, includedItem, relationMapItem);
      });
    }));
  } else {
    return _.filter(included, function (includedItem) {
      return isRelatedItemFor(attribute, includedItem, relationMap);
    });
  }
}

function isRelatedItemFor(attribute, relatedItem, relationMapItem) {
  var passesFilter = true;
  if (attribute.filter) {
    passesFilter = _.matches(relatedItem.attributes, attribute.filter);
  }
  return relatedItem.id === relationMapItem.id && relatedItem.type === relationMapItem.type && passesFilter;
}

module.exports = {
  resource: resource,
  collection: collection
};