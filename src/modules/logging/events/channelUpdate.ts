import { handleEvent, getUserTag, getChannelEmoji } from '../main';
import * as utils from '../../../lib/utils';
import { ChannelScopes } from '../classes';
import * as constants from '../../../constants/constants';

export function getKeys(log: discord.AuditLogEntry, chan: discord.Channel.AnyChannel, oldChan: discord.Channel.AnyChannel) {
  if (chan.type === discord.Channel.Type.DM || oldChan.type === discord.Channel.Type.DM) {
    return [];
  }
  const keys = [];
  if (chan.type !== discord.Channel.Type.GUILD_CATEGORY && oldChan.type !== discord.Channel.Type.GUILD_CATEGORY && (chan.parentId !== oldChan.parentId || typeof chan.parentId !== typeof oldChan.parentId)) {
    keys.push('parentId');
  }
  if (chan.position !== oldChan.position) {
    // keys.push('position');
  }
  if (chan.name !== oldChan.name) {
    keys.push('name');
  }
  if (chan.type !== oldChan.type) {
    keys.push('type');
  } else {
    // specific stuff
    if ((chan.type === discord.Channel.Type.GUILD_TEXT && oldChan.type === discord.Channel.Type.GUILD_TEXT)
    || (chan.type === discord.Channel.Type.GUILD_NEWS && oldChan.type === discord.Channel.Type.GUILD_NEWS)) {
      if (chan.nsfw !== oldChan.nsfw) {
        keys.push('nsfw');
      }
      if (chan.topic !== oldChan.topic) {
        keys.push('topic');
      }
    }
    if (chan.type === discord.Channel.Type.GUILD_TEXT && oldChan.type === discord.Channel.Type.GUILD_TEXT
        && (chan.rateLimitPerUser !== oldChan.rateLimitPerUser || typeof chan.rateLimitPerUser !== typeof oldChan.rateLimitPerUser)) {
      keys.push('rateLimitPerUser');
    }

    if (chan.type === discord.Channel.Type.GUILD_VOICE && oldChan.type === discord.Channel.Type.GUILD_VOICE) {
      if (chan.bitrate !== oldChan.bitrate) {
        keys.push('bitrate');
      }
      if (chan.userLimit !== oldChan.userLimit) {
        keys.push('userLimit');
      }
    }
  }
  if (keys.length > 0) {
    console.log('onChUpdate', keys);
  }
  // todo check perms (and check parent perms for syncing)
  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  chan: discord.Channel.AnyChannel,
  oldChan: discord.Channel.AnyChannel,
) {
  return false;
  if (['userLimit', 'position', 'parentId'].includes(key)) {
    return false;
  }
  return log instanceof discord.AuditLogEntry;
}
async function getChannelMention(chan: discord.GuildChannel, parent: undefined | discord.GuildCategory = undefined) {
  if (parent === undefined) {
    parent = typeof chan.parentId === 'string' ? await discord.getGuildCategory(chan.parentId) : null;
  }
  return `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name)}\`**>**` : ''}${chan.type === discord.Channel.Type.GUILD_TEXT ? chan.toMention() : `${getChannelEmoji(chan)}\`${utils.escapeString(chan.name)}\``}`;
}

export const messages = {
  async name(log: discord.AuditLogEntry, chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_TYPE_', 'NAME_CHANGED'],
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_NAME_', utils.escapeString(chan.name)],
      ['_OLD_NAME_', utils.escapeString(oldChan.name)],
    ]);
  },
  async parentId(log: discord.AuditLogEntry, chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
    const parExists = typeof chan.parentId === 'string' ? chan.parentId : 'None';
    const parent = parExists !== 'None' ? await discord.getGuildCategory(chan.parentId) : null;
    const oldParExists = typeof oldChan.parentId === 'string' ? oldChan.parentId : 'None';
    const parentOld = oldParExists !== 'None' ? await discord.getGuildCategory(oldChan.parentId) : null;
    const mention = await getChannelMention(chan, parent);
    return new Map([
      ['_TYPE_', 'CATEGORY_CHANGED'],
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_MENTION_', parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name)}\`` : `\`${parExists}\``],
      ['_OLD_MENTION_', parentOld !== null ? `${getChannelEmoji(parentOld)}\`${utils.escapeString(parentOld.name)}\`` : `\`${oldParExists}\``],
    ]);
  },
  async type(log: discord.AuditLogEntry, chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
    const mention = await getChannelMention(chan);
    const newType = constants.channelTypeMap.get(chan.type);
    const oldType = constants.channelTypeMap.get(oldChan.type);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_TYPE_', newType],
      ['_OLD_TYPE_', oldType],
      ['_TYPE_', 'TYPE_CHANGED'],
    ]);
  },
  async nsfw(log: discord.AuditLogEntry, chan: discord.GuildTextChannel | discord.GuildNewsChannel, oldChan: discord.GuildTextChannel| discord.GuildNewsChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_NSFW_', chan.nsfw === true ? 'Yes' : 'No'],
      ['_OLD_NSFW_', oldChan.nsfw === true ? 'Yes' : 'No'],
      ['_TYPE_', 'NSFW_CHANGED'],
    ]);
  },
  async topic(log: discord.AuditLogEntry, chan: discord.GuildTextChannel | discord.GuildNewsChannel, oldChan: discord.GuildTextChannel| discord.GuildNewsChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_TOPIC_', utils.escapeString(chan.topic)],
      ['_OLD_TOPIC_', utils.escapeString(oldChan.topic)],
      ['_TYPE_', 'TOPIC_CHANGED'],
    ]);
  },
  async rateLimitPerUser(log: discord.AuditLogEntry, chan: discord.GuildTextChannel, oldChan: discord.GuildTextChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_SLOWMODE_', chan.rateLimitPerUser.toString()],
      ['_OLD_SLOWMODE_', oldChan.rateLimitPerUser.toString()],
      ['_TYPE_', 'SLOWMODE_CHANGED'],
    ]);
  },
  async bitrate(log: discord.AuditLogEntry, chan: discord.GuildVoiceChannel, oldChan: discord.GuildVoiceChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_BITRATE_', chan.bitrate.toString()],
      ['_OLD_BITRATE_', oldChan.bitrate.toString()],
      ['_TYPE_', 'BITRATE_CHANGED'],
    ]);
  },
  async userLimit(log: discord.AuditLogEntry, chan: discord.GuildVoiceChannel, oldChan: discord.GuildVoiceChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_BITRATE_', chan.userLimit.toString()],
      ['_OLD_BITRATE_', oldChan.userLimit.toString()],
      ['_TYPE_', 'USERLIMIT_CHANGED'],
    ]);
  },
};

export async function AL_OnChannelUpdate(
  id: string,
  guildId: string,
  log: any,
  chan: discord.Channel.AnyChannel,
  oldChan: discord.Channel.AnyChannel,
) {
  await handleEvent(id, guildId, discord.Event.CHANNEL_UPDATE, log, chan, oldChan);
}
