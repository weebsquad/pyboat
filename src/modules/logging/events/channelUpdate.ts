import { handleEvent, getUserTag, getChannelEmoji } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(log: discord.AuditLogEntry, chan: discord.Channel.AnyChannel,oldChan: discord.Channel.AnyChannel) {
  if(chan.type === discord.Channel.Type.DM || oldChan.type === discord.Channel.Type.DM) return [];
  const keys = [];
  if(chan.type !== discord.Channel.Type.GUILD_CATEGORY && oldChan.type !== discord.Channel.Type.GUILD_CATEGORY && chan.parentId !== oldChan.parentId) keys.push('parentId');
  if(chan.position !== oldChan.position) keys.push('position');
  if(chan.name !== oldChan.name) keys.push('name');
  if(chan.type !== oldChan.type) {
    keys.push('type');
  } else {
     // specific stuff
    if((chan.type === discord.Channel.Type.GUILD_TEXT && oldChan.type === discord.Channel.Type.GUILD_TEXT) || 
    (chan.type === discord.Channel.Type.GUILD_NEWS && oldChan.type === discord.Channel.Type.GUILD_NEWS)) {
        if(chan.nsfw !== oldChan.nsfw) keys.push('nsfw');
        if(chan.topic !== oldChan.topic) keys.push('topic');
    }
    if(chan.type === discord.Channel.Type.GUILD_TEXT && oldChan.type === discord.Channel.Type.GUILD_TEXT
        && chan.rateLimitPerUser !== oldChan.rateLimitPerUser) keys.push('rateLimitPerUser');

    
    if(chan.type === discord.Channel.Type.GUILD_VOICE && oldChan.type === discord.Channel.Type.GUILD_VOICE) {
        if(chan.bitrate !== oldChan.bitrate) keys.push('bitrate');
        if(chan.userLimit !== oldChan.userLimit) keys.push('userLimit');
    }
  }
  // todo check perms

}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  chan: discord.Channel.AnyChannel,
  oldChan: discord.Channel.AnyChannel
) {
  if(['userLimit','position'].includes(key)) return false;
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
    /*
  async (log: discord.AuditLogEntry, chan: discord.GuildChannel,
    oldChan: discord.Channel.AnyChannel) {
    const parent = typeof chan.parentId === 'string' ? await discord.getGuildCategory(chan.parentId) : null;
    const name = `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name)}\`**>**` : ''}${chan.type === discord.Channel.Type.GUILD_TEXT ? chan.toMention() : `${getChannelEmoji(chan)}\`${utils.escapeString(chan.name)}\``}`;

    return new Map([
      ['_TYPE_', ],
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_NAME_', name],
    ]);
  },*/
};

export async function AL_OnChannelUpdate(
  id: string,
  guildId: string,
  log: any,
  chan: discord.Channel.AnyChannel,
  oldChan: discord.Channel.AnyChannel
) {
  await handleEvent(id, guildId, discord.Event.CHANNEL_UPDATE, log, chan, oldChan);
}
