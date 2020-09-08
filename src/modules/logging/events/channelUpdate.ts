import { handleEvent, getUserTag, getChannelEmoji, isIgnoredChannel } from '../main';
import * as utils from '../../../lib/utils';
import { ChannelScopes } from '../classes';
import * as constants from '../../../constants/constants';
import { eventData } from '../tracking';

async function isParentPermSync(chan: discord.GuildChannel) {
  if (typeof chan.parentId !== 'string') {
    return false;
  }
  const parent = await discord.getGuildCategory(chan.parentId);
  const newOv = chan.permissionOverwrites;
  const parOv = parent.permissionOverwrites;
  let isSync = true;
  newOv.map((e) => {
    const _f = parOv.find((obj) => obj.id === e.id);
    if (!_f) {
      isSync = false;
    } else if (e.allow !== _f.allow || e.deny !== _f.deny || e.type !== _f.type) {
      isSync = false;
    }
  });
  parOv.map((e) => {
    const _f = newOv.find((obj) => obj.id === e.id);
    if (!_f) {
      isSync = false;
    } else if (e.allow !== _f.allow || e.deny !== _f.deny || e.type !== _f.type) {
      isSync = false;
    }
  });
  return isSync;
}

async function getChannelMention(chan: discord.GuildChannel, parent: undefined | discord.GuildCategory = undefined) {
  if (parent === undefined) {
    parent = typeof chan.parentId === 'string' ? await discord.getGuildCategory(chan.parentId) : null;
  }
  return `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name)}\`**>**` : ''}${chan.type === discord.Channel.Type.GUILD_TEXT ? chan.toMention() : `${getChannelEmoji(chan)}\`${utils.escapeString(chan.name)}\``}`;
}

function getPermDiffs(chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
  const ret: {[key: string]: Array<discord.Channel.IPermissionOverwrite>} = {
    added: [],
    removed: [],
    changed: [],
  };
  const newOv = chan.permissionOverwrites;
  const oldOv = oldChan.permissionOverwrites;
  newOv.map((e) => {
    const _f = oldOv.find((obj) => obj.id === e.id);
    if (!_f) {
      if (!ret.added.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.added.push(e);
      }
    } else if (e.allow !== _f.allow || e.deny !== _f.deny || e.type !== _f.type) {
      if (!ret.changed.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.changed.push(e);
      }
    }
  });
  oldOv.map((e) => {
    const _f = newOv.find((obj) => obj.id === e.id);
    if (!_f) {
      if (!ret.removed.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.removed.push(e);
      }
    } else if (e.allow !== _f.allow || e.deny !== _f.deny || e.type !== _f.type) {
      if (!ret.changed.find((obj: discord.Channel.IPermissionOverwrite) => obj.id === e.id)) {
        ret.changed.push(e);
      }
    }
  });
  return ret;
}

export async function getKeys(log: discord.AuditLogEntry, chan: discord.Channel.AnyChannel, oldChan: discord.Channel.AnyChannel) {
  if (chan.type === discord.Channel.Type.DM || oldChan.type === discord.Channel.Type.DM) {
    return [];
  }
  if (isIgnoredChannel(chan)) {
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
  }
  // specific stuff

  if ((chan.type === discord.Channel.Type.GUILD_NEWS || chan.type === discord.Channel.Type.GUILD_TEXT)
    && (oldChan.type === discord.Channel.Type.GUILD_NEWS || oldChan.type === discord.Channel.Type.GUILD_TEXT)) {
    if (chan.nsfw !== oldChan.nsfw) {
      keys.push('nsfw');
    }
    if (chan.topic !== oldChan.topic) {
      keys.push('topic');
    }
  }
  // slowmode
  if (chan.type === discord.Channel.Type.GUILD_TEXT && oldChan.type === discord.Channel.Type.GUILD_NEWS) {
    // if converting from a news channel
    if (chan.rateLimitPerUser !== 0) {
      keys.push('rateLimitPerUser');
    }
  } else if (chan.type === discord.Channel.Type.GUILD_TEXT && oldChan.type === discord.Channel.Type.GUILD_TEXT && (chan.rateLimitPerUser !== oldChan.rateLimitPerUser || typeof chan.rateLimitPerUser !== typeof oldChan.rateLimitPerUser)) {
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

  const pDiffs = getPermDiffs(chan, oldChan);
  if (pDiffs.added.length > 0 || pDiffs.changed.length > 0 || pDiffs.removed.length > 0) {
    const isSync = await isParentPermSync(chan);
    if (isSync) {
      keys.push('parentPermissionSynchronization');
    } else {
      keys.push('permissionsChanged');
    }
  }

  return keys;
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  chan: discord.Channel.AnyChannel,
  oldChan: discord.Channel.AnyChannel,
) {
  if (['userLimit', 'position', 'parentId', 'parentPermissionSynchronization'].includes(key)) {
    return false;
  }
  return log instanceof discord.AuditLogEntry;
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
      ['_NEW_TOPIC_', utils.escapeString(chan.topic !== null && chan.topic !== undefined ? chan.topic : 'None')],
      ['_OLD_TOPIC_', utils.escapeString(oldChan.topic !== null && oldChan.topic !== undefined ? oldChan.topic : 'None')],
      ['_TYPE_', 'TOPIC_CHANGED'],
    ]);
  },
  async rateLimitPerUser(log: discord.AuditLogEntry, chan: discord.GuildTextChannel, oldChan: discord.GuildTextChannel | discord.GuildNewsChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_SLOWMODE_', chan.rateLimitPerUser.toString()],
      ['_OLD_SLOWMODE_', oldChan.type === discord.Channel.Type.GUILD_TEXT ? oldChan.rateLimitPerUser.toString() : '???'],
      ['_TYPE_', 'SLOWMODE_CHANGED'],
    ]);
  },
  async bitrate(log: discord.AuditLogEntry, chan: discord.GuildVoiceChannel, oldChan: discord.GuildVoiceChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_NEW_BITRATE_', Math.floor(chan.bitrate / 1000).toString()],
      ['_OLD_BITRATE_', Math.floor(oldChan.bitrate / 1000).toString()],
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
  async parentPermissionSynchronization(log: discord.AuditLogEntry, chan: discord.GuildChannel) {
    const mention = await getChannelMention(chan);
    const parExists = typeof chan.parentId === 'string' ? chan.parentId : 'None';
    const parent = parExists !== 'None' ? await discord.getGuildCategory(chan.parentId) : null;
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_PARENT_MENTION_', parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name)}\`` : `\`${parExists}\``],
      ['_TYPE_', 'PERMS_SYNCED'],
    ]);
  },
  async permissionsChanged(log: discord.AuditLogEntry, chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
    const changes = getPermDiffs(chan, oldChan);
    const mention = await getChannelMention(chan);
    const guild = await chan.getGuild();
    let txt = '';
    const { added } = changes;
    const { removed } = changes;
    const edited = changes.changed;
    const allIds = new Array<string>();
    added.map((e) => {
      if (!allIds.includes(e.id)) {
        allIds.push(e.id);
      }
    });
    edited.map((e) => {
      if (!allIds.includes(e.id)) {
        allIds.push(e.id);
      }
    });
    removed.map((e) => {
      if (!allIds.includes(e.id)) {
        allIds.push(e.id);
      }
    });
    allIds.forEach((e) => {
      const oldV = oldChan.permissionOverwrites.find((obj) => obj.id === e);
      const newV = chan.permissionOverwrites.find((obj) => obj.id === e);
      const _type = newV !== undefined ? newV.type : oldV.type;
      const _id = newV !== undefined ? newV.id : oldV.id;
      let objectPing = `${_type === 'role' ? `<@&${_id}>` : `<@!${_id}>`}`;
      if (_type === 'role' && _id === guild.id) {
        // everyone role
        objectPing = '@everyone';
      }
      const permsAllowOld = oldV !== undefined ? new utils.Permissions(oldV.allow).serialize(false) : new utils.Permissions(0).serialize();
      const permsDenyOld = oldV !== undefined ? new utils.Permissions(oldV.deny).serialize(false) : new utils.Permissions(0).serialize();
      const permsAllowNew = newV !== undefined ? new utils.Permissions(newV.allow).serialize(false) : new utils.Permissions(0).serialize();
      const permsDenyNew = newV !== undefined ? new utils.Permissions(newV.deny).serialize(false) : new utils.Permissions(0).serialize();
      if (!oldV && newV) { // Added!
        txt += `\nAdded ${newV.type} ${objectPing}`;
      } else if (oldV && !newV) {
        txt += `\nRemoved ${oldV.type} ${oldV.type === 'role' ? `<@&${oldV.id}>` : `<@!${oldV.id}>`}`;
      } else if (oldV && newV) {
        txt += `\nChanged ${newV.type} ${objectPing}`;
      }
      const serOld: {[key: string]: number} = {};
      const serNew: {[key: string]: number} = {};
      for (const key in permsAllowOld) {
        if (permsAllowOld[key] === true) {
          serOld[key] = 1;
        } else if (permsDenyOld[key] === true) {
          serOld[key] = -1;
        } else {
          serOld[key] = 0;
        }
      }
      for (const key in permsAllowNew) {
        if (permsAllowNew[key] === true) {
          serNew[key] = 1;
        } else if (permsDenyNew[key] === true) {
          serNew[key] = -1;
        } else {
          serNew[key] = 0;
        }
      }
      const diffs: {[key: string]: number} = {};
      for (const key in serOld) {
        if (serOld[key] !== serNew[key]) {
          diffs[key] = serNew[key];
        }
      }
      if (Object.keys(diffs).length > 0) {
        txt += '\n```diff\n';
        for (let key in diffs) {
          const val = diffs[key];
          let symbol = '';
          if (val === 0) {
            symbol = '•';
          } else if (val === 1) {
            symbol = '+';
          } else if (val === -1) {
            symbol = '-';
          }
          if (symbol === '') {
            continue;
          }
          key = key.split('_').join(' ');
          key = key.split(' ').map((ee) => `${ee.substr(0, 1).toUpperCase()}${ee.substr(1).toLowerCase()}`).join(' ');
          txt += `\n${symbol} ${key}`;
        }
        txt += '\n```\n';
      }
    });
    return new Map([
      ['_CHANNEL_ID_', chan.id],
      ['_CHANNEL_MENTION_', mention],
      ['_CHANGES_', txt],
      ['_TYPE_', 'PERMS_CHANGED'],
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
