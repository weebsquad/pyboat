import { handleEvent, getUserTag, getChannelEmoji, isIgnoredChannel, isMaster } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(log: discord.AuditLogEntry, chan: discord.Channel.AnyChannel) {
  if (chan.type === discord.Channel.Type.DM) {
    return isMaster() === true ? ['dmChannelOpened'] : [];
  }
  if (isIgnoredChannel(chan)) {
    return [];
  }
  return ['channelCreated'];
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
  async channelCreated(log: discord.AuditLogEntry, chan: discord.GuildChannel) {
    const parent = typeof chan.parentId === 'string' ? await discord.getGuildCategory(chan.parentId) : null;
    return new Map([
      ['TYPE', 'CHANNEL_CREATED'],
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${chan.type === discord.Channel.Type.GUILD_TEXT ? chan.toMention() : `${getChannelEmoji(chan)}\`${utils.escapeString(chan.name, true)}\``}`],
    ]);
  },
  async dmChannelOpened(log: discord.AuditLogEntry, chan: discord.DmChannel) {
    const usr = await utils.getUser(chan.id);
    if (usr === null) {
      return;
    }
    return new Map([['TYPE', 'DM_CHANNEL_OPENED'], ['USERTAG', getUserTag(usr)]]);
  },
};

export async function AL_OnChannelCreate(
  id: string,
  guildId: string,
  log: any,
  chan: discord.Channel.AnyChannel,
) {
  await handleEvent(id, guildId, discord.Event.CHANNEL_CREATE, log, chan);
}
