import { IRootObject } from './typings';
import { globalConfig } from '../config';

let defaultLanguage: IRootObject;

function transformJson(json: any): IRootObject {
  return json as IRootObject;
}

async function fetchLanguage(langCode: string): Promise<IRootObject> {
  console.log('url', `${globalConfig.localization.cdnUrl}${langCode}.json`);
  const req = await fetch(`${globalConfig.localization.cdnUrl}${langCode}.json`);
  const json = await req.json();
  return transformJson(json);
}
function recursiveDefault(source: any, dest: any) {
  for (const key in source) {
    const obj = source[key];
    if (obj !== null && typeof obj === 'object') {
      if (Array.isArray(obj) && !Array.isArray(dest[key])) {
        dest[key] = obj;
        continue;
      } else {
        if (typeof (dest[key]) !== 'object') {
          dest[key] = {};
        }

        dest[key] = recursiveDefault(obj, dest[key]);
      }
      continue;
    }
    if (dest[key] === undefined || dest[key] === '') {
      dest[key] = obj;
    }
  }
  return dest;
}

export async function buildLanguage(langCode: string): Promise<IRootObject> {
  console.log('building language', langCode);
  if (!defaultLanguage) {
    defaultLanguage = await fetchLanguage(globalConfig.localization.default);
  }
  let initial;
  try {
    initial = await fetchLanguage(langCode);
  } catch (e) {
    return defaultLanguage;
  }
  return transformJson(recursiveDefault(defaultLanguage, initial));
}
