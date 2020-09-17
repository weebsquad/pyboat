import { handleEvent, isIgnoredChannel } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IMessageReactionRemoveAll,
) {
  if (isIgnoredChannel(ev.channelId)) {
    return [];
  }
  return ['reaction'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return false;
}

export const messages = {
  async reaction(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageReactionRemoveAll,
  ) {
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map();
    mp.set('_TYPE_', 'REMOVED_ALL_REACTIONS');
    mp.set('_CHANNEL_ID_', ev.channelId);
    mp.set('_MESSAGE_ID_', ev.messageId);
    return mp;
  },
};

export async function OnMessageReactionRemoveAll(
  id: string,
  guildId: string,
  ev: discord.Event.IMessageReactionRemoveAll,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.MESSAGE_REACTION_REMOVE_ALL,
    null,
    ev,
  );
}
