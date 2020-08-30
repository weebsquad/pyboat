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
import * as admin from './admin';

export const moduleDefinitions: {[key: string]: unknown} = {
  logging,
  admin, // since it only does tracking, let's allow it to run first
  antiSpam,
  censor,
  antiPing,
  counting,
  roleManagement,
  infractions,
  utilities,
  starboard,
  translation,
  commands,
};
export const asyncModules = ['logging'];
