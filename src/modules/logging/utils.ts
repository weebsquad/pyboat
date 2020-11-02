import * as conf from '../../config';
import * as utils from '../../lib/utils';

export function isDebug(bypassMaster = false) {
  return (bypassMaster || conf.guildId === conf.globalConfig.masterGuild) && typeof (conf.config.modules.logging.debug) === 'boolean' && conf.config.modules.logging.debug === true;
}

export function changeLoggingTimezone(dt: Date) {
  if (!conf.config.modules.logging.timezone) {
    return dt;
  }
  return utils.changeTimezone(dt, conf.config.modules.logging.timezone);
}

export function isIgnoredChannel(channel: discord.GuildChannel | string) {
  if (channel instanceof discord.GuildChannel) {
    channel = channel.id;
  }
  const { ignores } = conf.config.modules.logging;
  if (!ignores || typeof ignores !== 'object') {
    return false;
  }
  let chans = Array.isArray(ignores.channels) ? [].concat(ignores.channels) : [];
  // let parents = Array.isArray(ignores.categories) ? [].concat(ignores.parents) : [];
  if (ignores.logChannels === true) {
    const _lc: any = Array.from(Object.keys(conf.config.modules.logging.logChannels));
    chans = chans.concat(_lc);
  }
  return chans.includes(channel);
}

export function isIgnoredUser(user: string | discord.User | discord.GuildMember) {
  if (user instanceof discord.User) {
    user = user.id;
  }
  if (user instanceof discord.GuildMember) {
    user = user.user.id;
  }
  const { ignores } = conf.config.modules.logging;
  if (!ignores) {
    return false;
  }
  const usrs = Array.isArray(ignores.users) ? [].concat(ignores.users) : [];
  if (ignores.self === true) {
    usrs.push(discord.getBotId());
  }
  if (ignores.blacklistedUsers && utils.isBlacklisted(user)) {
    return true;
  }
  return usrs.includes(user);
}
export function isIgnoredActor(user: string | discord.User | discord.GuildMember) {
  if (user instanceof discord.User) {
    user = user.id;
  }
  if (user instanceof discord.GuildMember) {
    user = user.user.id;
  }
  const { ignores } = conf.config.modules.logging;
  if (!ignores) {
    return false;
  }
  const usrs = Array.isArray(ignores.users) && conf.config.modules.logging.extendUsersToAuditLogs === true ? [].concat(ignores.users) : [];
  if (ignores.selfAuditLogs === true) {
    usrs.push(discord.getBotId());
  }
  if (ignores.blacklistedUsers && utils.isBlacklisted(user)) {
    return true;
  }
  return usrs.includes(user);
}

export function isMaster() {
  return conf.guildId === conf.globalConfig.masterGuild;
}
export function isMasterInDebug() {
  return true;
}
export function isExternalDebug(gid: string = conf.guildId) {
  return isMasterInDebug() && gid !== conf.globalConfig.masterGuild;
}

export function getChannelEmoji(ch: discord.GuildChannel) {
  if (ch.type === discord.GuildChannel.Type.GUILD_TEXT) {
    return '<:channel:735780703983239218>';
  }
  if (ch.type === discord.GuildChannel.Type.GUILD_VOICE) {
    return '<:voice:735780703928844319>';
  }
  if (ch.type === discord.GuildChannel.Type.GUILD_STORE) {
    return '<:store:735780704130170880>';
  }
  if (ch.type === discord.GuildChannel.Type.GUILD_NEWS) {
    return '<:news:735780703530385470>';
  }
  if (ch.type === discord.GuildChannel.Type.GUILD_CATEGORY) {
    return '<:category:754241739258069043>';
  }
  return '';
}

export function getMemberTag(member: discord.GuildMember) {
  if (member === null || typeof member !== 'object') {
    return member;
  }
  const nick = member.nick ?? member.user.username;
  const map = new Map([
    ['_TAG_', utils.escapeString(member.user.getTag())],
    ['_USERNAME_', utils.escapeString(member.user.username)],
    ['_DISCRIMINATOR_', member.user.discriminator],
    ['_NICKNAME_', utils.escapeString(nick)],
    ['_ID_', member.user.id],
    ['_MENTION_', member.toMention()],
  ]);
  let tg = conf.config.modules.logging.userTag;
  for (const [key, value] of map) {
    tg = tg.split(key).join(value);
  }
  return tg;
}

export function getUserTag(user: discord.User | discord.GuildMember) {
  if (user === null || typeof user !== 'object') {
    return user;
  }
  if (user instanceof discord.GuildMember) {
    user = user.user;
  }
  const map = new Map([
    ['_TAG_', utils.escapeString(user.getTag())],
    ['_USERNAME_', utils.escapeString(user.username)],
    ['_DISCRIMINATOR_', user.discriminator],
    ['_ID_', user.id],
    ['_NICKNAME_', utils.escapeString(user.username)],
    ['_MENTION_', user.toMention()],
  ]);
  let tg = conf.config.modules.logging.userTag;
  for (const [key, value] of map) {
    tg = tg.split(key).join(value);
  }
  return tg;
}

export async function parseMessageContent(
  msg: discord.Message,
  update = false,
) {
  let cont = msg.content;
  let MAXLEN = 1400;
  const LEN_CODEBLOCKS = 400;
  const MAXNEWLINES = 25;
  const MAXLENSINGLELINE = 200;
  if (update) {
    MAXLEN = Math.floor(MAXLEN / 2);
  }
  cont = cont.split('\t').join(' ');
  let test = cont.split('\n');
  test = test.filter((e) => e !== '');
  let cutVertical = false;
  if (test.length >= MAXNEWLINES) {
    test = test.slice(0, Math.min(test.length, MAXNEWLINES));
    cutVertical = true;
  }
  cont = utils.escapeString(test.join('\n'), false, true);

  const usrIds = new Map<string, string>();
  const channelIds = new Map<string, discord.GuildChannel>();
  const roleIds = new Map<string, string>();
  /*
  let users = cont.match(/<@![0-9]{18}>/g)?.map(function(e) {
    e = e.split(' ').join('');
    e = e.substr(3).slice(0, -1);
    return e;
  });
  let usr2 = cont.match(/<@[0-9]{18}>/g)?.map(function(e) {
    e = e.split(' ').join('');
    e = e.substr(2).slice(0, -1);
    return e;
  });
  if (!Array.isArray(users) && Array.isArray(usr2))
    users = new Array().concat(usr2); */
  let roles = cont.match(/<@&[0-9]{18}>/g);
  if (Array.isArray(roles)) {
    roles = roles.map((e) => {
      e = e.split(' ').join('');
      e = e.substr(3).slice(0, -1);
      return e;
    });
  }

  let channels = cont.match(/<#[0-9]{18}>/g);
  if (Array.isArray(channels)) {
    channels = channels.map((e) => {
      e = e.split(' ').join('');
      e = e.substr(2).slice(0, -1);
      return e;
    });
  }
  /*

  if (Array.isArray(users)) {
    await Promise.allSettled(
      users.map(async function(u) {
        if (!usrIds.has(u)) {
          const _usr = await utils.getUser(u);
          if (_usr === null) return;
          usrIds.set(u, _usr.getTag());
        }
      })
    );
    for (let [id, tag] of usrIds) {
      cont = cont.replace(`<@!${id}>`, '@' + tag);
    }
  }
*/
  if (Array.isArray(channels)) {
    await Promise.all(
      channels.map(async (u) => {
        if (!channelIds.has(u) && u !== discord.getBotId()) {
          const chan = (await discord.getChannel(u));
          if (chan === null || chan.type !== discord.Channel.Type.GUILD_TEXT) {
            return;
          }
          channelIds.set(u, chan);
        }
      }),
    );
    for (const [id, ch] of channelIds) {
      let ico = '#';
      if (ch.type === discord.Channel.Type.GUILD_VOICE) {
        ico = '🔊';
      }
      if (ch.type === discord.Channel.Type.GUILD_CATEGORY) {
        ico = '‣';
      }
      cont = cont.split(`<#${ch.id}>`).join(ico + ch.name);
    }
  }
  if (msg.mentions.length > 0) {
    msg.mentions.forEach((usr) => {
      cont = cont
        .split(`<@!${usr.id}>`)
        .join(`@${usr.username}#${usr.discriminator}`)
        .split(`<@${usr.id}>`)
        .join(`@${usr.username}#${usr.discriminator}`);
    });
  }
  if (Array.isArray(roles) && roles.length > 0) {
    const guild = await msg.getGuild();
    if (guild !== null) {
      await Promise.all(
        roles.map(async (u) => {
          if (!roleIds.has(u)) {
            const rl = await guild.getRole(u);
            if (rl === null) {
              return;
            }
            roleIds.set(u, rl.name);
          }
        }),
      );
      for (const [id, tag] of roleIds) {
        cont = cont.split(`<@&${id}>`).join(`@${tag}`);
      }
    }
  }
  if (cont.length >= MAXLEN) {
    cont = `${cont.substring(0, Math.min(cont.length, MAXLEN))} [...]`;
  } else if (cutVertical) {
    cont += '\n[...]';
  }
  if (cont.length > 0) {
    if (cont.includes('\n') || cont.length >= LEN_CODEBLOCKS) {
      cont = `\`\`\`\n${cont}\n\`\`\``;
    } else {
      if (!cutVertical && cont.length > MAXLENSINGLELINE) {
        cont = `${cont.substring(0, Math.min(cont.length, MAXLENSINGLELINE))} [...]`;
      }

      cont = `\`${cont}\``;
    }
  }
  return cont;
}
export function getActorTag(user: discord.User | discord.GuildMember) {
  if (user === null || typeof user !== 'object') {
    return user;
  }
  let nick: string;
  if (user instanceof discord.GuildMember) {
    nick = user.nick ?? user.user.username;
    user = user.user;
  } else {
    nick = user.username;
  }

  const map = new Map([
    ['_TAG_', utils.escapeString(user.getTag())],
    ['_USERNAME_', utils.escapeString(user.username)],
    ['_DISCRIMINATOR_', user.discriminator],
    ['_ID_', user.id],
    ['_MENTION_', user.toMention()],
    ['_NICKNAME_', utils.escapeString(nick)],
  ]);
  let tg = conf.config.modules.logging.actorTag;
  for (const [key, value] of map) {
    tg = tg.split(key).join(value);
  }
  return tg;
}

export function getLogMessage(
  eventName: string,
  eventAction: string,
  auditLog = false,
  bypassSuffix = false,
) {
  if (auditLog === true) {
    let obj: string = conf.config.modules.logging.messagesAuditLogs[eventName][eventAction];
    if (
      conf.config.modules.logging.suffixReasonToAuditlog
      && obj.indexOf('_REASON_') === -1
      && obj.indexOf('_REASON_RAW_') === -1
      && !bypassSuffix
    ) {
      obj += '_REASON_';
    }
    return obj;
  }
  return conf.config.modules.logging.messages[eventName][eventAction];
}

export function replacePlaceholders(txt: string, map: Map<string, string>) {
  // txt = '[_TYPE_] ' + txt;

  for (const [key, value] of map) {
    if (key.substr(0, 1) !== '_' && key.substr(key.length - 1, 1) !== '_') {
      continue;
    }
    txt = txt.split(key).join(value);
  }
  return txt;
}
