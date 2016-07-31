'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function buildErrors(serverErrors) {
  if (!serverErrors) {
    console.log('Unidentified error');
    return;
  } else {
    var _ret = function () {
      var errors = {};
      serverErrors.errors.forEach(function (error) {
        errors[errorKey(error.source)] = error.title;
      });
      return {
        v: errors
      };
    }();

    if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
  }
}

function errorKey(source) {
  return source.pointer.split('/').pop();
}

module.exports = {
  name: 'errors',
  error: function error(payload) {
    return buildErrors(payload.data);
  }
};