import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel } from '../main';
import * as utils from '../../../lib/utils';
import * as utils2 from '../utils';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IMessageDeleteBulk,
) {
  if (isIgnoredChannel(ev.channelId)) {
    return [];
  }
  return ['messagesDeleted'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  async messagesDeleted(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageDeleteBulk,
  ) {
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();
    mp.set('TYPE', 'MESSAGES_DELETED');
    mp.set('COUNT', ev.ids.length);
    mp.set('CHANNEL_ID', ev.channelId);
    return mp;
  },
};

export async function AL_OnMessageDeleteBulk(
  id: string,
  guildId: string,
  log: any,
  ev: discord.Event.IMessageDeleteBulk,
) {
  await handleEvent(id, guildId, discord.Event.MESSAGE_DELETE_BULK, log, ev);
}
