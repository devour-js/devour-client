import axios from 'axios';

export default {
  name: 'axios-request',
  req: function (payload) {
    return axios(payload.req);
  }
};
