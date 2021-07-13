import { config } from '../config';
import * as utils from './utils';
// const key = config.global.googleApi.key;
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
  const queryParams = `?${formGAPIParams(config.modules.translation.googleApi.key, query, target)}`;
  const fullUrl = `${endpointTranslate}${queryParams}`;
  const req = new Request(fullUrl, {
    method: 'POST',
  });
  const request = await (await fetch(req)).json();
  if (typeof request.error === 'object') {
    throw new Error(request.error.message);
  }
  if (
    !Array.isArray(request.data.translations)
    || request.data.translations.length !== 1
  ) {
    throw new Error(request);
  }
  return request.data.translations[0];
}

export async function detectLanguage(query: string) {
  const params = {
    q: query,
    key: config.modules.translation.googleApi.key,
  };
  const queryParams = `?${formParams(params)}`;
  const fullUrl = `${endpointDetect}${queryParams}`;
  const req = new Request(fullUrl, {
    method: 'POST',
  });
  const request = await (await fetch(req)).json();
  if (typeof request.error === 'object') {
    utils.logError(request);
    throw new Error(request.error.message);
  }
  if (!Array.isArray(request.data.detections) || request.data.detections < 1) {
    utils.logError(request);
    throw new Error(request);
  }
  return request.data.detections[0];
}
