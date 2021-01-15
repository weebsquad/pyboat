import { handleEvent, getUserTag, getMemberTag, isIgnoredUser } from '../main';
import { guildId, config } from '../../../config';
import * as utils from '../../../lib/utils';

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
          if (k === 'AUTHOR') {
            mp.set('USERTAG', getUserTag(v));
            mp.set('USER', v);
          }
          if (k === 'MEMBER') {
            mp.set('USERTAG', getMemberTag(v));
            mp.set('USER', v);
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
  cat: string,
  subtype: string,
  placeholders: Map<string, any> | undefined = undefined,
  id: string = utils.composeSnowflake(),
) {
  if (config === undefined) {
    return;
  }
  cat = cat.toUpperCase();
  subtype = subtype.toUpperCase();
  if (placeholders && placeholders.has('USER_ID') && isIgnoredUser(placeholders.get('USER_ID'))) {
    return;
  }
  if (cat.substr(0, 1) !== '|') {
    cat = `|${cat}`;
  }
  const evCat = config.modules.logging.messages[cat];
  if (!evCat) {
    throw new Error(`Tried to log ${cat}.${subtype} but category not defined in messages!`);
  }
  const evMsg = evCat[subtype];
  if (!evMsg) {
    throw new Error(`Tried to log ${cat}.${subtype} but subtype not defined in messages!`);
  }
  await handleEvent(
    id,
    guildId, // todo: change!
    cat,
    null,
    subtype,
    placeholders,
  );
}

export async function logDebug(
  type: string,
  placeholders: Map<string, any> | undefined = undefined,
  id: string = utils.composeSnowflake(),
) {
  if (config === undefined) {
    return;
  }
  if (type === 'BOT_ERROR') {
    // utils.logError(placeholders.get('ERROR'));
  }
  const evData = config.modules.logging.messages.DEBUG[type];
  if (evData === undefined) {
    throw new Error(`Tried to log ${type} but not defined in config!`);
  }
  await handleEvent(
    id,
    guildId, // todo: change!
    'DEBUG',
    null,
    type,
    placeholders,
  );
}
