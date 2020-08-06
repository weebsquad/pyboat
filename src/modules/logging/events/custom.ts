import { handleEvent, getUserTag, getMemberTag } from '../main';
import * as conf from '../../../config';
import * as utils from '../../../lib/utils';

const config = conf.config.modules.logging;

export function getKeys(log: discord.AuditLogEntry, ...args: any) {
  return ['customLog'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  customLog(
    log: discord.AuditLogEntry,
    typeSent: string,
    others: Map<string, any> | undefined = undefined,
  ) {
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map<string, string>();
    mp.set('_TYPE_', typeSent);
    if (typeof others !== 'undefined') {
      others.forEach((v, k) => {
        if (k.substring(0, 1) !== '_') {
          k = `_${k}`;
        }
        if (k.slice(-1) !== '_') {
          k += '_';
        }
        k = k.toUpperCase();
        if (typeof v !== 'string') {
          if (k === '_AUTHOR_') {
            mp.set('_USERTAG_', getUserTag(v));
          }
          if (k === '_MEMBER_') {
            mp.set('_USERTAG_', getMemberTag(v));
          }
        }
        if (typeof v !== 'string') {
          return;
        }
        mp.set(k, v);
      });
    }
    return mp;
  },
};

export async function logCustom(
  type: string,
  placeholders: Map<string, any> | undefined = undefined,
  id: string = utils.composeSnowflake(),
) {
  const evData = config.messages.CUSTOM[type];
  if (evData === undefined) {
    console.error(`Tried to log ${type} but not defined in config!`); // because our error tracking stuff sometimes fails, too
    throw new Error(`Tried to log ${type} but not defined in config!`);
  }
  await handleEvent(
    id,
    conf.guildId, // todo: change!
    'CUSTOM',
    null,
    type,
    placeholders,
  );
}

export async function logDebug(
  type: string,
  placeholders: Map<string, any> | undefined = undefined,
  id: string = utils.composeSnowflake(),
) {
  // if (type === 'BOT_ERROR') console.error(placeholders.get('ERROR'));
  const evData = config.messages.DEBUG[type];
  if (evData === undefined) {
    throw new Error(`Tried to log ${type} but not defined in config!`);
  }
  await handleEvent(
    id,
    conf.guildId, // todo: change!
    'DEBUG',
    null,
    type,
    placeholders,
  );
}
