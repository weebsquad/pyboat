/* eslint-disable */
import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(log: discord.AuditLogEntry, ...args: any) {
  const keys = [];
  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  ...args: any
) {
  return false;
}

export const messages = {
  key(log: discord.AuditLogEntry, ...args: any) {
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map();
    const type = 'CONFIG_KEY';
    mp.set('_TYPE_', type);
    return mp;
  },
};

export async function AL_OnEvent(
  id: string,
  guildId: string,
  log: any,
  ...args: any
) {
  // await handleEvent(id, guildId, discord.Event, log, args);
}
