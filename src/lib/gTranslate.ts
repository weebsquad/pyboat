import { config } from '../config';
//const key = config.global.googleApi.key;
const key = config.modules.translation.googleApi.key;
const endpointTranslate =
  'https://translation.googleapis.com/language/translate/v2';
const endpointDetect =
  'https://translation.googleapis.com/language/translate/v2/detect';

export function formParams(params: any) {
  var esc = encodeURIComponent;
  var query = Object.keys(params)
    .map((k) => esc(k) + '=' + esc(params[k]))
    .join('&');
  return query;
}

function formGAPIParams(key: string, query: string, target: string) {
  let params = {
    q: query,
    target: target,
    format: 'text',
    key: key
  };
  return formParams(params);
}

export async function translate(query: string, target: string) {
  let queryParams = '?' + formGAPIParams(key, query, target);
  let fullUrl = `${endpointTranslate}${queryParams}`;
  let req = new Request(fullUrl, {
    method: 'POST'
  });
  let request = await (await fetch(req)).json();
  if (typeof request.error === 'object') {
    console.error(request.error);
    throw new Error();
  }
  if (
    !Array.isArray(request.data.translations) ||
    request.data.translations.length !== 1
  ) {
    console.error(request);
    throw new Error();
  }
  return request.data.translations[0];
}

export async function detectLanguage(query: string) {
  let params = {
    q: query,
    key: key
  };
  let queryParams = '?' + formParams(params);
  let fullUrl = `${endpointDetect}${queryParams}`;
  let req = new Request(fullUrl, {
    method: 'POST'
  });
  let request = await (await fetch(req)).json();
  if (typeof request.error === 'object') {
    console.error(request.error);
    throw new Error();
  }
  if (!Array.isArray(request.data.detections) || request.data.detections < 1) {
    console.error(request);
    throw new Error();
  }
  return request.data.detections[0];
}
