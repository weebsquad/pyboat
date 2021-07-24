import { handleEvent, getUserTag, getChannelEmoji, isIgnoredChannel } from '../main';
import * as utils from '../../../lib/utils';
import { ChannelScopes } from '../classes';
import * as constants from '../../../constants/constants';
import { eventData } from '../tracking';
import { language as i18n } from '../../../localization/interface';

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
  return `${parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`**>**` : ''}${chan.type === discord.Channel.Type.GUILD_TEXT ? chan.toMention() : `${getChannelEmoji(chan)}\`${utils.escapeString(chan.name, true)}\``}`;
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

  if ((chan.type === discord.Channel.Type.GUILD_VOICE && oldChan.type === discord.Channel.Type.GUILD_VOICE) || (chan.type === discord.Channel.Type.GUILD_STAGE_VOICE && oldChan.type === discord.Channel.Type.GUILD_STAGE_VOICE)) {
    if (chan.bitrate !== oldChan.bitrate) {
      keys.push('bitrate');
    }
    if (chan.userLimit !== oldChan.userLimit) {
      keys.push('userLimit');
    }
  }

  const pDiffs = utils.getPermDiffs(chan, oldChan);
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
      ['TYPE', 'NAME_CHANGED'],
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_NAME', utils.escapeString(chan.name, true)],
      ['OLD_NAME', utils.escapeString(oldChan.name, true)],
    ]);
  },
  async parentId(log: discord.AuditLogEntry, chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
    const parExists = typeof chan.parentId === 'string' ? chan.parentId : 'None';
    const parent = parExists !== 'None' ? await discord.getGuildCategory(chan.parentId) : null;
    const oldParExists = typeof oldChan.parentId === 'string' ? oldChan.parentId : 'None';
    const parentOld = oldParExists !== 'None' ? await discord.getGuildCategory(oldChan.parentId) : null;
    const mention = await getChannelMention(chan, parent);
    return new Map([
      ['TYPE', 'CATEGORY_CHANGED'],
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_MENTION', parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`` : `\`${parExists}\``],
      ['OLD_MENTION', parentOld !== null ? `${getChannelEmoji(parentOld)}\`${utils.escapeString(parentOld.name, true)}\`` : `\`${oldParExists}\``],
    ]);
  },
  async type(log: discord.AuditLogEntry, chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
    const mention = await getChannelMention(chan);
    const newType = constants.channelTypeMap.get(chan.type);
    const oldType = constants.channelTypeMap.get(oldChan.type);
    return new Map([
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_TYPE', newType],
      ['OLD_TYPE', oldType],
      ['TYPE', 'TYPE_CHANGED'],
    ]);
  },
  async nsfw(log: discord.AuditLogEntry, chan: discord.GuildTextChannel | discord.GuildNewsChannel, oldChan: discord.GuildTextChannel| discord.GuildNewsChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_NSFW', chan.nsfw === true ? i18n.modules.logging.l_terms.yes : i18n.modules.logging.l_terms.no],
      ['OLD_NSFW', oldChan.nsfw === true ? i18n.modules.logging.l_terms.yes : i18n.modules.logging.l_terms.no],
      ['TYPE', 'NSFW_CHANGED'],
    ]);
  },
  async topic(log: discord.AuditLogEntry, chan: discord.GuildTextChannel | discord.GuildNewsChannel, oldChan: discord.GuildTextChannel| discord.GuildNewsChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_TOPIC', utils.escapeString(chan.topic !== null && chan.topic !== undefined ? chan.topic : 'None', true)],
      ['OLD_TOPIC', utils.escapeString(oldChan.topic !== null && oldChan.topic !== undefined ? oldChan.topic : 'None', true)],
      ['TYPE', 'TOPIC_CHANGED'],
    ]);
  },
  async rateLimitPerUser(log: discord.AuditLogEntry, chan: discord.GuildTextChannel, oldChan: discord.GuildTextChannel | discord.GuildNewsChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_SLOWMODE', chan.rateLimitPerUser.toString()],
      ['OLD_SLOWMODE', oldChan.type === discord.Channel.Type.GUILD_TEXT ? oldChan.rateLimitPerUser.toString() : '???'],
      ['TYPE', 'SLOWMODE_CHANGED'],
    ]);
  },
  async bitrate(log: discord.AuditLogEntry, chan: discord.GuildVoiceChannel, oldChan: discord.GuildVoiceChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_BITRATE', Math.floor(chan.bitrate / 1000).toString()],
      ['OLD_BITRATE', Math.floor(oldChan.bitrate / 1000).toString()],
      ['TYPE', 'BITRATE_CHANGED'],
    ]);
  },
  async userLimit(log: discord.AuditLogEntry, chan: discord.GuildVoiceChannel, oldChan: discord.GuildVoiceChannel) {
    const mention = await getChannelMention(chan);
    return new Map([
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['NEW_LIMIT', chan.userLimit.toString()],
      ['OLD_LIMIT', oldChan.userLimit.toString()],
      ['TYPE', 'USERLIMIT_CHANGED'],
    ]);
  },
  async parentPermissionSynchronization(log: discord.AuditLogEntry, chan: discord.GuildChannel) {
    const mention = await getChannelMention(chan);
    const parExists = typeof chan.parentId === 'string' ? chan.parentId : 'None';
    const parent = parExists !== 'None' ? await discord.getGuildCategory(chan.parentId) : null;
    return new Map([
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['PARENT_MENTION', parent !== null ? `${getChannelEmoji(parent)}\`${utils.escapeString(parent.name, true)}\`` : `\`${parExists}\``],
      ['TYPE', 'PERMS_SYNCED'],
    ]);
  },
  async permissionsChanged(log: discord.AuditLogEntry, chan: discord.GuildChannel, oldChan: discord.GuildChannel) {
    const changes = utils.getPermDiffs(chan, oldChan);
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

      let _type: any = newV !== undefined ? newV.type : oldV.type;
      if (_type == 1) { // eslint-disable-line eqeqeq
        _type = 'member';
      } else {
        _type = 'role';
      }
      let _id = newV !== undefined ? newV.id : oldV.id;
      if (oldV && !newV) {
        _id = oldV.id;
      }
      let objectPing = `${_type === 'role' ? `<@&${_id}>` : `<@!${_id}>`}`;
      if (_type === 'role' && _id === guild.id) {
        // everyone role
        objectPing = utils.escapeString('@everyone');
      }
      const permsAllowOld = oldV !== undefined ? new utils.Permissions(oldV.allow).serialize(false) : new utils.Permissions(0).serialize();
      const permsDenyOld = oldV !== undefined ? new utils.Permissions(oldV.deny).serialize(false) : new utils.Permissions(0).serialize();
      const permsAllowNew = newV !== undefined ? new utils.Permissions(newV.allow).serialize(false) : new utils.Permissions(0).serialize();
      const permsDenyNew = newV !== undefined ? new utils.Permissions(newV.deny).serialize(false) : new utils.Permissions(0).serialize();
      if (!oldV && newV) { // Added!
        txt += `\n${i18n.modules.logging.l_terms.added} ${_type} ${objectPing}`;
      } else if (oldV && !newV) {
        txt += `\n${i18n.modules.logging.l_terms.removed} ${_type} ${objectPing}`;
      } else if (oldV && newV) {
        txt += `\n${i18n.modules.logging.l_terms.changed} ${_type} ${objectPing}`;
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

      if (oldV && !newV) {
        for (const key in permsAllowOld) {
          if (permsAllowOld[key] === true) {
            diffs[key] = 1;
          } else if (permsDenyOld[key] === true) {
            diffs[key] = -1;
          }
        }
      }
      if (!oldV && newV) {
        for (const key in permsAllowNew) {
          if (permsAllowNew[key] === true) {
            diffs[key] = 1;
          } else if (permsDenyNew[key] === true) {
            diffs[key] = -1;
          }
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
      ['CHANNEL_ID', chan.id],
      ['CHANNEL_MENTION', mention],
      ['CHANGES', txt],
      ['TYPE', 'PERMS_CHANGED'],
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
