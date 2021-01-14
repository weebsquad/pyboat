/* eslint-disable import/no-mutable-exports */
import { IRootObject } from './typings';
import * as builder from './builder';

export let language: IRootObject;

export async function Initialize() {
  language = await builder.buildLanguage('pt_PT');
  console.log('language', language);
}
