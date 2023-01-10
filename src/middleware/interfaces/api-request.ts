export interface ApiRequest {
  url: string;
  method: string;
  model?: string;
  params?: { [key: string]: any };
  data?: { [key: string]: string };
  meta?: { [key: string]: string };
}
