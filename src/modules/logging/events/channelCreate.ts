import { handleEvent, getUserTag, getChannelEmoji } from '../main';

export function getKeys(log: discord.AuditLogEntry, chan: discord.Channel.AnyChannel) {
  if (chan.type === discord.Channel.Type.DM) {
    return ['dmChannelOpened'];
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
    return new Map([['_TYPE_', 'CHANNEL_CREATED'], ['_CHANNEL_ID_', chan.id], ['_CHANNEL_NAME_', chan.type === discord.Channel.Type.GUILD_TEXT ? chan.toMention() : `${getChannelEmoji(chan)}\`${chan.name}\``]]);
  },
  async dmChannelOpened(log: discord.AuditLogEntry, chan: discord.DmChannel) {
    const usr = await discord.getUser(chan.id);
    if (usr === null) {
      return;
    }
    return new Map([['_TYPE_', 'DM_CHANNEL_OPENED'], ['_USERTAG_', getUserTag(usr)]]);
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
