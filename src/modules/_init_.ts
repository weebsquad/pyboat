import * as antiPing from './antiPing';
import * as commands from './commands';
import * as counting from './counting';
import * as logging from './logging/tracking';
import * as roleManagement from './roleManagement';
import * as translation from './translation';
import * as utilities from './utilities';
import * as infractions from './infractions';

export const moduleDefinitions: {[key: string]: unknown} = {
  logging,
  antiPing,
  counting,
  roleManagement,
  commands,
  translation,
  infractions,
  utilities,
};
export const asyncModules = ['logging'];
