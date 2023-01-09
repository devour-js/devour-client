import axios, { AxiosResponse } from 'axios';

export default {
  name: 'axios-request',
  req: function (payload): Promise<AxiosResponse> {
    return axios(payload.req);
  }
};
