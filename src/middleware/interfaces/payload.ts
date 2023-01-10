import { JsonApi } from '../../jsonapi';

export interface Payload {
  req: any;
  jsonApi: JsonApi;
  res?: any;
}
