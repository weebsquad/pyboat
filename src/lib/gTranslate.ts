import { config } from '../config';
// const key = config.global.googleApi.key;
const { key } = config.modules.translation.googleApi;
const endpointTranslate = 'https://translation.googleapis.com/language/translate/v2';
const endpointDetect = 'https://translation.googleapis.com/language/translate/v2/detect';

export function formParams(params: any) {
  const esc = encodeURIComponent;
  const query = Object.keys(params)
    .map((k) => `${esc(k)}=${esc(params[k])}`)
    .join('&');
  return query;
}

function formGAPIParams(key: string, query: string, target: string) {
  const params = {
    q: query,
    target,
    format: 'text',
    key,
  };
  return formParams(params);
}

export async function translate(query: string, target: string) {
  const queryParams = `?${formGAPIParams(key, query, target)}`;
  const fullUrl = `${endpointTranslate}${queryParams}`;
  const req = new Request(fullUrl, {
    method: 'POST',
  });
  const request = await (await fetch(req)).json();
  if (typeof request.error === 'object') {
    console.error(request.error);
    throw new Error();
  }
  if (
    !Array.isArray(request.data.translations)
    || request.data.translations.length !== 1
  ) {
    console.error(request);
    throw new Error();
  }
  return request.data.translations[0];
}

export async function detectLanguage(query: string) {
  const params = {
    q: query,
    key,
  };
  const queryParams = `?${formParams(params)}`;
  const fullUrl = `${endpointDetect}${queryParams}`;
  const req = new Request(fullUrl, {
    method: 'POST',
  });
  const request = await (await fetch(req)).json();
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
