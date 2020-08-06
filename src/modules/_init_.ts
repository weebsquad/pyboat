/* eslint-disable no-undef */
import * as commands from './commands';
import * as roleManagement from './roleManagement';
import * as counting from './counting';
import * as translation from './translation';
import * as logging from './logging/tracking';
import * as utilities from './utilities';
import * as antiPing from './antiPing';
import * as roleSeperator from './roleSeperator';

export const moduleDefinitions: {[key: string]: object} = {
  logging,
  antiPing,
  roleSeperator,
  counting,
  roleManagement,
  commands,
  translation,
  utilities,
};
export const asyncModules = ['logging'];
