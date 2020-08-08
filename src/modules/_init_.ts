/* eslint-disable no-undef */
import * as conf from '../config';
import * as commands from './commands';
import * as roleManagement from './roleManagement';
import * as counting from './counting';
import * as translation from './translation';
import * as logging from './logging/tracking';
import * as utilities from './utilities';
import * as antiPing from './antiPing';

export const moduleDefinitions: {[key: string]: unknown} = {
  logging,
  antiPing,
  counting,
  roleManagement,
  commands,
  translation,
  utilities,
};
export const asyncModules = ['logging'];
