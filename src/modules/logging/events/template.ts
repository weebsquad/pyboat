import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(log: discord.AuditLogEntry, ...args: any) {
  console.log('getKeys', args);
  let keys = new Array();
  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  ...args: any
) {
  console.log('isAuditLog', args);
  return false;
}

export const messages = {
  key: function(log: discord.AuditLogEntry, ...args: any) {
    console.log('messages.key', args);
    //let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    let mp = new Map();
    let type = 'CONFIG_KEY';
    mp.set('_TYPE_', type);
    return mp;
  }
};

export async function AL_OnEvent(
  id: string,
  guildId: string,
  log: any,
  ...args: any
) {
  console.log('onEvent.', args);
  await handleEvent(id, guildId, discord.Event, log, args);
}
