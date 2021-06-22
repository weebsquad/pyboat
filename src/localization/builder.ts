import { IRootObject } from './typings';
import { globalConfig } from '../config';

let defaultLanguage: IRootObject;

function transformJson(json: any): IRootObject {
  return json as IRootObject;
}

async function fetchLanguage(langCode: string): Promise<IRootObject> {
  if (langCode.length < 1) {
    throw new Error('invalid language code!');
  }
  const req = await fetch(`${globalConfig.localization.cdnUrl}${langCode}.json`);
  const json = await req.json();
  return transformJson(json);
}

async function fetchLanguageDefault(langCode: string): Promise<IRootObject> {
  if (langCode.length < 1) {
    throw new Error('invalid language code!');
  }
  const req = await fetch(`${globalConfig.localization.cdnUrl}/defaults/${langCode}.json`);
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

export async function buildLanguage(defaultLang: string, langCode: string): Promise<IRootObject> {
  // console.log('building language', langCode);
  /* if (!defaultLanguage) {
    defaultLanguage = await fetchLanguage(defaultLang);
  }
  let initial;
  try {
    initial = await fetchLanguage(langCode);
  } catch (e) {
    return defaultLanguage;
  }
  return transformJson(recursiveDefault(defaultLanguage, initial));
  */
  if (defaultLang === langCode) {
    const lang = await fetchLanguage(defaultLang);
    return lang;
  }
  try {
    const lang = await fetchLanguageDefault(langCode);
    console.log('lang', lang);
    return lang;
  } catch (_) {
    const lang = await fetchLanguage(defaultLang);
    return lang;
  }
}
