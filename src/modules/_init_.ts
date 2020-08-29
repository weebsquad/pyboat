import * as antiPing from './antiPing';
import * as commands from './commands';
import * as counting from './counting';
import * as logging from './logging/tracking';
import * as roleManagement from './roleManagement';
import * as translation from './translation';
import * as utilities from './utilities';
import * as infractions from './infractions';
import * as starboard from './starboard';
import * as censor from './censor';
import * as antiSpam from './antiSpam';

export const moduleDefinitions: {[key: string]: unknown} = {
  logging,
  antiSpam: antiSpam,
  censor,
  antiPing,
  counting,
  roleManagement,
  translation,
  infractions,
  utilities,
  starboard,
  commands,
};
export const asyncModules = ['logging'];
