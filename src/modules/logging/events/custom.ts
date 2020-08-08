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
  cat: string,
  subtype: string,
  placeholders: Map<string, any> | undefined = undefined,
  id: string = utils.composeSnowflake(),
) {
  cat = cat.toUpperCase();
  if (cat.substr(0, 1) !== '|') {
    cat = `|${cat}`;
  }
  const evCat = config.messages[cat];
  if (!evCat) {
    throw new Error(`Tried to log ${cat}.${subtype} but category not defined in messages!`);
  }
  const evMsg = evCat[subtype];
  if (!evMsg) {
    throw new Error(`Tried to log ${cat}.${subtype} but subtype not defined in messages!`);
  }
  await handleEvent(
    id,
    conf.guildId, // todo: change!
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
