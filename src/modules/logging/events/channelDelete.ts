import { handleEvent, getUserTag, getChannelEmoji, isIgnoredChannel } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(log: discord.AuditLogEntry, chan: discord.Channel.AnyChannel) {
  if (chan.type === discord.Channel.Type.DM) {
    return [];
  }
  if (isIgnoredChannel(chan)) {
    return [];
  }
  return ['channelDeleted'];
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  chan: discord.Channel.AnyChannel,
) {
  if (key === 'dmChannelOpened') {
    return false;
  }
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  async channelDeleted(log: discord.AuditLogEntry, chan: discord.GuildChannel) {
    const parent = typeof chan.parentId === 'string' ? await discord.getGuildCategory(chan.parentId) : null;
    return new Map([
      ['_TYPE_', 'CHANNEL_DELETED'],
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${getChannelEmoji(chan)}\`${utils.escapeString(chan.name, true)}\``],
    ]);
  },
};

export async function AL_OnChannelDelete(
  id: string,
  guildId: string,
  log: any,
  chan: discord.Channel.AnyChannel,
) {
  await handleEvent(id, guildId, discord.Event.CHANNEL_DELETE, log, chan);
}
