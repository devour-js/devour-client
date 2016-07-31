'use strict';

module.exports = {
  name: 'DELETE',
  req: function req(payload) {
    if (payload.req.method === 'DELETE') {
      payload.req.headers = {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      };
      delete payload.req.data;
    }

    return payload;
  }
};