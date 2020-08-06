import * as commands from './commands';
import * as roleManagement from './roleManagement';
import * as counting from './counting';
import * as translation from './translation';
import * as logging from './logging/tracking';
import * as utilities from './utilities';
import * as antiPing from './antiPing';
import * as roleSeperator from './roleSeperator';

export const moduleDefinitions = <any>{
  logging: logging,
  antiPing: antiPing,
  roleSeperator: roleSeperator,
  counting: counting,
  roleManagement: roleManagement,
  commands: commands,
  translation: translation,
  utilities: utilities
};
export const asyncModules = new Array('logging');
