import { handleEvent, getUserTag, getMemberTag } from '../main';
import * as utils from '../../../lib/utils';
import * as utils2 from '../utils';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IMessageDeleteBulk,
) {
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
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map();
    mp.set('_TYPE_', 'MESSAGES_DELETED');
    mp.set('_COUNT_', ev.ids.length);
    mp.set('_CHANNEL_ID_', ev.channelId);
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
