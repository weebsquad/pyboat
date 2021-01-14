/* eslint-disable import/no-mutable-exports */

import { IRootObject } from './typings';
import * as builder from './builder';
import { config } from '../config';

export let language: IRootObject;

export function setPlaceholders(str: string, placeholders: Array<string>): string {
  if (placeholders.length === 0 || placeholders.length % 2 !== 0) {
    throw new Error('placeholders\' length needs to be a multiple of two');
  }
  let toReplace = '';
  for (let i = 0; i < placeholders.length; i++) {
    if ((i % 2) !== 0) {
      // not pair
      str = str.split(`{${toReplace}}`).join(placeholders[i]);
    } else {
      // pair
      toReplace = placeholders[i].toUpperCase();
    }
  }
  return str;
}

export async function Initialize() {
  language = await builder.buildLanguage(config.language);
}
