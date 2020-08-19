import * as antiPing from './antiPing';
import * as commands from './commands';
import * as counting from './counting';
import * as logging from './logging/tracking';
import * as roleManagement from './roleManagement';
import * as translation from './translation';
import * as utilities from './utilities';

export const moduleDefinitions: {[key: string]: unknown} = {
  logging,
  antiPing,
  counting,
  roleManagement,
  // commands,
  // translation,
  // utilities,
};
export const asyncModules = ['logging'];
