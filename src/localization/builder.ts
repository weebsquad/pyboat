import { IRootObject } from './typings';

const defaultLanguageCode = 'en_US';
let defaultLanguage: IRootObject;
const cdnUrl = 'https://pyboat.i0.tf/i18n/';

function transformJson(json: any): IRootObject {
  return json as IRootObject;
}

async function fetchLanguage(langCode: string): Promise<IRootObject> {
  const req = await fetch(`${cdnUrl}${langCode}.json`);
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
  if (!defaultLanguage) {
    defaultLanguage = await fetchLanguage(defaultLanguageCode);
  }
  const initial = await fetchLanguage(langCode);
  const built = transformJson(recursiveDefault(defaultLanguage, initial));
  return built;
}
