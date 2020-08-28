import { config, globalConfig, Ranks, guildId } from '../config';
import { UrlRegex, EmojiRegex, InviteRegex, ZalgoRegex, AsciiRegex } from '../constants/constants';
import * as utils from '../lib/utils';
import { logCustom } from './logging/events/custom';
import { getUserTag, getMemberTag } from './logging/main';

enum CensorType {
    'INVITE'= 'invite',
    'URL' = 'url',
    'ZALGO' = 'zalgo',
    'WORD' = 'word',
    'TOKEN' = 'token',
    'CAPS' = 'caps',
    'CHAR' = 'char'
}
class CensorCheck {
    target: string | undefined;
    type: CensorType;
    message: string | undefined;
    stop = false;
    check = false;
    constructor(check: boolean, type: CensorType, message: string | undefined, target: string | undefined = undefined, stop: boolean | undefined = false) {
      this.check = check;
      this.type = type;
      this.message = message;
      this.target = target;
      this.stop = stop;
      return this;
    }
}
export function getApplicableConfigs(member: discord.GuildMember, channel: discord.GuildChannel | undefined = undefined): Array<any> {
  const toret = [];
  const cfgMod = config.modules.censor;
  if (typeof channel !== 'undefined' && typeof cfgMod.channels === 'object' && Object.keys(cfgMod.channels).includes(channel.id)) {
    toret.push(cfgMod.channels[channel.id]);
  }
  if (typeof channel !== 'undefined' && typeof channel.parentId === 'string' && channel.parentId !== '' && channel.type !== discord.Channel.Type.GUILD_CATEGORY && typeof cfgMod.categories === 'object' && Object.keys(cfgMod.categories).includes(channel.parentId)) {
    toret.push(cfgMod.categories[channel.parentId]);
  }
  if (typeof cfgMod.levels === 'object') {
    const auth = utils.getUserAuth(member);
    Object.keys(cfgMod.levels).map((item) => (utils.isNumber(item) && utils.isNormalInteger(item) ? parseInt(item, 10) : -1)).sort().reverse()
      .map((lvl) => {
        if (typeof lvl === 'number' && lvl >= auth && lvl >= 0) {
          toret.push(cfgMod.levels[lvl]);
        }
      });
  }
  return toret;
}
export async function getCensorshipData(txt: string, checkInvites = false, checkUrls = false, checkZalgo = false) {
  const toret = {
    invites: checkInvites === true ? [] : undefined,
    urls: checkUrls === true ? [] : undefined,
    zalgo: checkZalgo === true ? [] : undefined,
  };
  if (checkInvites === true) {
    const invites = txt.match(InviteRegex);
    if (Array.isArray(invites) && invites.length > 0) {
      let _invs = [...new Set(invites)].map((url) => {
        let code: any = '';
        if (url.includes('/')) {
          code = url.split('/');
          code = code[code.length - 1];
        }
        if (code !== '' && code.length > 1) {
          return code;
        }
        return undefined;
      }).filter((item) => typeof item === 'string');
      if (_invs.length >= 10) {
        toret.invites.concat(_invs);
      } else {
        await Promise.all(_invs.map(async (code) => {
          const thisInv = await discord.getInvite(code);
          if (thisInv instanceof discord.Invite) {
            toret.invites.push(thisInv);
          }
        }));
        _invs = _invs.filter((code) => {
          const _f = toret.invites.find((e) => e instanceof discord.Invite && e.code === code);
          return !_f;
        });
        toret.invites.concat(_invs);
      }
    }
  }
  if (checkUrls === true) {
    const urls: any = txt.match(UrlRegex);
    if (Array.isArray(urls) && urls.length > 0) {
      toret.urls = [...new Set(urls)].map((url) => new URL(url));
    }
  }
  if (checkZalgo === true) {
    const zalgo: any = txt.match(ZalgoRegex);
    if (Array.isArray(zalgo) && zalgo.length > 0) {
      toret.zalgo = [...new Set(zalgo)];
    }
  }

  return toret;
}
export async function getDataFromConfig(txt: string, thisCfg: any, checkWords = false, checkTokens = false, checkCaps = false, checkChars = false) {
  const toRet = { words: checkWords === true ? [] : undefined,
    tokens: checkTokens === true ? [] : undefined,
    caps: checkCaps === true ? [] : undefined,
    chars: checkChars === true ? [] : undefined,
  };
  if (checkWords === true) {
    const blocks = thisCfg.words.filter((w) => typeof w === 'string' && w.length > 0);
    let found = [];
    let splitting = txt.includes(' ') ? txt.toLowerCase().split(' ') : [txt.toLowerCase()];
    if (txt.includes('\n')) {
      const topush = [];
      const newl = splitting.filter((ch) => {
        if (ch.includes('\n')) {
          topush.push(...ch.split('\n'));
          return false;
        } return true;
      });
      newl.push(...topush);
      splitting = newl;
    }
    found = splitting.filter((txt2) => blocks.includes(txt2));
    if (Array.isArray(found) && found.length > 0) {
      toRet.words = [...new Set(found)];
    }
  }
  if (checkTokens === true) {
    const blocks: any = txt.match(new RegExp(thisCfg.tokens.filter((w) => typeof w === 'string' && w.length > 0).join('|'), 'gi'));
    if (Array.isArray(blocks) && blocks.length > 0) {
      toRet.tokens = blocks;
    }
  }
  if (checkCaps === true) {
    const minLength = typeof thisCfg.caps.minLength === 'number' ? thisCfg.caps.minLength : 5;
    if (txt.length >= minLength) {
      const matches = txt.match(/[A-z]/gi);
      if (Array.isArray(matches) && matches.length > 0) {
        if (typeof thisCfg.caps.percentage === 'number') {
          const thisCapped = matches.filter((e) => e.toUpperCase() === e).length;
          const thisPct = Math.floor((thisCapped / matches.length) * 100);
          if (thisPct > thisCfg.caps.percentage) {
            toRet.caps.push(`${thisPct}% / ${thisCfg.caps.percentage}%`);
          }
        }
        if (typeof thisCfg.caps.followed === 'number') {
          let inARow = 0;
          for (let i = 0; i < matches.length; i += 1) {
            const thisc = matches[i];
            if (thisc.toUpperCase() === matches[i]) {
              inARow += 1;
            } else {
              inARow = 0;
            }
            if (inARow >= thisCfg.caps.followed) {
              toRet.caps.push(`${inARow} followed`);
              break;
            }
          }
        }
      }
    }
  }
  if (checkChars === true) {
    const charCfg = thisCfg.chars;
    if (typeof charCfg.limit === 'number' && txt.length > charCfg.limit) {
      toRet.chars.push(`${txt.length}/${charCfg.limit} characters`);
    }
    if (typeof charCfg.newLines === 'number' && txt.includes('\n')) {
      const newlines = txt.split('\n').length - 1;
      if (newlines > charCfg.newLines) {
        toRet.chars.push(`${newlines}/${charCfg.newLines} newlines`);
      }
    }
    if (typeof charCfg.noAscii === 'boolean' && charCfg.noAscii === true) {
      const asciiremoved = txt.replace(AsciiRegex, '');
      console.log('noascii', asciiremoved);
      if (asciiremoved !== txt) {
        toRet.chars.push('Illegal ASCII');
      }
    }
  }
  return toRet;
}
export function checkCensors(data: any, thisCfg: any): CensorCheck {
  const _stop = typeof thisCfg.stop === 'boolean' ? thisCfg.stop : false;
  const { invites } = data;
  const { urls } = data;
  const { zalgo } = data;
  const { words } = data;
  const { tokens } = data;
  const { caps } = data;
  const { chars } = data;
  if (typeof thisCfg.invites === 'object' && Array.isArray(invites) && invites.length > 0) {
    const invCfg = thisCfg.invites;
    const allowVanities = typeof invCfg.vanityUrl === 'boolean' ? invCfg.vanityUrl : false;
    const allowSelf = typeof invCfg.self === 'boolean' ? invCfg.self : false;
    const allowedGuilds = typeof invCfg.whitelist === 'object' && Array.isArray(invCfg.whitelist.guilds) ? invCfg.whitelist.guilds : null;
    const deniedGuilds = typeof invCfg.blacklist === 'object' && Array.isArray(invCfg.blacklist.guilds) ? invCfg.blacklist.guilds : [];
    const allowedCodes = typeof invCfg.whitelist === 'object' && Array.isArray(invCfg.whitelist.codes) ? invCfg.whitelist.codes : null;
    const deniedCodes = typeof invCfg.blacklist === 'object' && Array.isArray(invCfg.blacklist.codes) ? invCfg.blacklist.codes : [];

    if (invites.length > 5) {
      return new CensorCheck(true, CensorType.INVITE, 'Too many codes', undefined, _stop);
    }

    for (let i = 0; i < invites.length; i++) {
      const inv: string | discord.Invite = invites[i];
      if (!(inv instanceof discord.Invite)) {
        if (deniedCodes.length > 0 && deniedCodes.includes(inv)) {
          return new CensorCheck(true, CensorType.INVITE, 'Invite code in blacklist', inv, _stop);
        }
        continue;
      }
      if (Array.isArray(allowedGuilds) && !allowedGuilds.includes(inv.guild.id)) {
        if (!(inv.guild.id === guildId && allowSelf === true) && !(inv.guild.vanityUrlCode !== null && typeof inv.guild.vanityUrlCode === 'string' && inv.guild.vanityUrlCode.length >= 2 && allowVanities === true)) {
          return new CensorCheck(true, CensorType.INVITE, 'Guild not in whitelist', inv.guild.id, _stop);
        }
      }
      if (deniedGuilds.length > 0 && deniedGuilds.includes(inv.guild.id)) {
        return new CensorCheck(true, CensorType.INVITE, 'Guild in blacklist', inv.guild.id, _stop);
      }
      if (Array.isArray(allowedCodes) && !allowedCodes.includes(inv)) {
        if (!(inv.guild.id === guildId && allowSelf === true) && !(inv.guild.vanityUrlCode !== null && typeof inv.guild.vanityUrlCode === 'string' && inv.guild.vanityUrlCode.length >= 2 && allowVanities === true)) {
          return new CensorCheck(true, CensorType.INVITE, 'Invite code not in whitelist', inv.guild.id, _stop);
        }
      }
      if (deniedCodes.length > 0 && deniedCodes.includes(inv)) {
        return new CensorCheck(true, CensorType.INVITE, 'Invite code in blacklist', inv.guild.id, _stop);
      }
    }
  }

  if (typeof thisCfg.urls === 'object' && Array.isArray(urls) && urls.length > 0) {
    const urlCfg = thisCfg.urls;
    const allowSubdomains = typeof urlCfg.allowSubdomains === 'boolean' ? urlCfg.allowSubdomains : false;
    const allowed = typeof urlCfg.whitelist === 'object' && Array.isArray(urlCfg.whitelist) ? urlCfg.whitelist : null;
    const denied = typeof urlCfg.blacklist === 'object' && Array.isArray(urlCfg.blacklist) ? urlCfg.blacklist : [];
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];
      const host = url.hostname;
      if (denied.includes(host)) {
        return new CensorCheck(true, CensorType.URL, 'Domain in blacklist', host, _stop);
      }
      if (Array.isArray(allowed) && !allowed.includes(host)) {
        if (allowSubdomains === true && host.includes('.') && host.split('.').length > 2) {
          const splitted = host.split('.');
          const actualDomain = `${splitted[splitted.length - 2]}.${splitted[splitted.length - 1]}`;
          if (allowed.includes(actualDomain) && !denied.includes(actualDomain)) {
            continue;
          }
        }
        return new CensorCheck(true, CensorType.URL, 'Domain not in whitelist', host, _stop);
      }
    }
  }
  if (typeof thisCfg.zalgo === 'object' && Array.isArray(zalgo) && zalgo.length > 0) {
    return new CensorCheck(true, CensorType.ZALGO, 'Zalgo found', zalgo.length.toString(), _stop);
  }
  if (typeof thisCfg.words === 'object' && Array.isArray(words) && words.length > 0) {
    return new CensorCheck(true, CensorType.WORD, 'Blocked words found', words.join(', '), _stop);
  }
  if (typeof thisCfg.tokens === 'object' && Array.isArray(tokens) && tokens.length > 0) {
    return new CensorCheck(true, CensorType.TOKEN, 'Blocked tokens found', tokens.join(', '), _stop);
  }
  if (typeof thisCfg.caps === 'object' && Array.isArray(caps) && caps.length > 0) {
    return new CensorCheck(true, CensorType.CAPS, 'Too many capital letters', caps.join(', '), _stop);
  }
  if (typeof thisCfg.chars === 'object' && Array.isArray(chars) && chars.length > 0) {
    return new CensorCheck(true, CensorType.CHAR, 'Illegal characters', chars.join(', '), _stop);
  }
  return new CensorCheck(false, undefined, undefined, undefined, _stop);
}

export async function checkMessage(message: discord.Message.AnyMessage) {
  if (message.guildId === null || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT || message.webhookId !== null || !message.author || message.author.bot === true || message.flags !== 0) {
    return;
  }
  if (!(message instanceof discord.GuildMemberMessage)) {
    return;
  }
  const channel = await message.getChannel();
  if (channel === null) {
    return;
  }
  const me = await (await channel.getGuild()).getMember(discord.getBotId());
  if (!channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
    return;
  }
  const appConfigs = getApplicableConfigs(message.member, channel);

  let grabInvites = false;
  let grabUrls = false;
  let grabZalgo = false;
  let grabWords = false;
  let grabTokens = false;
  let grabCaps = false;
  let grabChars = false;
  for (let i = 0; i < appConfigs.length; i += 1) {
    const val = appConfigs[i];
    if (typeof val.invites === 'object') {
      grabInvites = true;
    }
    if (typeof val.urls === 'object') {
      grabUrls = true;
    }
    if (typeof val.zalgo === 'object') {
      grabZalgo = true;
    }
    if (Array.isArray(val.words)) {
      grabWords = true;
    }
    if (Array.isArray(val.tokens)) {
      grabTokens = true;
    }
    if (typeof val.caps === 'object') {
      grabCaps = true;
    }
    if (typeof val.chars === 'object') {
      grabChars = true;
    }
    if (typeof val.stop === 'boolean' && val.stop === true) {
      break;
    }
  }
  const data = await getCensorshipData(message.content, grabInvites, grabUrls, grabZalgo);
  for (let i = 0; i < appConfigs.length; i += 1) {
    const extraData = await getDataFromConfig(message.content, appConfigs[i], grabWords, grabTokens, grabCaps, grabChars);
    const _newd = { ...data, ...extraData };
    console.log(_newd);
    const check = checkCensors(_newd, appConfigs[i]);
    if (check instanceof CensorCheck) {
      if (check.check === true) {
        await message.delete();
        await message.reply(JSON.stringify(check));
        await logCustom('CENSOR', 'CENSORED_MESSAGE', new Map([['_CENSOR_TYPE_', check.type], ['_CENSOR_MESSAGE_', check.message], ['_CENSOR_TARGET_', typeof check.target !== 'undefined' ? check.target : 'unknown'], ['_MESSAGE_ID_', message.id], ['_CHANNEL_ID_', message.channelId], ['_USERTAG_', getMemberTag(message.member)], ['_USER_ID_', message.author.id]]));
        return false;
      }
      if (check.stop === true) {
        break;
      }
    }
  }
}
export async function OnMessageCreate(
  id: string,
  gid: string,
  message: discord.Message.AnyMessage,
) {
  const _ret = await checkMessage(message);
  return _ret;
}
export async function OnMessageUpdate(
  id: string,
  gid: string,
  message: discord.Message,
  oldMessage: discord.Message,
) {
  if (oldMessage === null || message.content === oldMessage.content) {
    return;
  }
  const _ret = await checkMessage(message);
  return _ret;
}

export async function checkName(member: discord.GuildMember) {
  const guild = await member.getGuild();
  if (guild === null) {
    return;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  const myHighest = await utils.getMemberHighestRole(me);
  const memberHighest = await utils.getMemberHighestRole(member);
  if (myHighest.position <= memberHighest.position) {
    return;
  }
  if (!me.can(discord.Permissions.MANAGE_NICKNAMES)) {
    return;
  }
  const visibleName = typeof member.nick === 'string' && member.nick.length > 0 ? member.nick : member.user.username;

  const cfgMod = config.modules.censor;
  if (typeof cfgMod.nameChecks !== 'object') {
    return;
  }
  const appConfigs = [];
  const auth = utils.getUserAuth(member);
  Object.keys(cfgMod.nameChecks).map((item) => (utils.isNumber(item) && utils.isNormalInteger(item) ? parseInt(item, 10) : -1)).sort().reverse()
    .map((lvl) => {
      if (typeof lvl === 'number' && lvl >= auth && lvl >= 0) {
        appConfigs.push(cfgMod.nameChecks[lvl]);
      }
    });
  let grabInvites = false;
  let grabUrls = false;
  let grabZalgo = false;
  let grabWords = false;
  let grabTokens = false;
  let grabCaps = false;
  let grabChars = false;
  for (let i = 0; i < appConfigs.length; i += 1) {
    const val = appConfigs[i];
    if (typeof val.invites === 'object') {
      grabInvites = true;
    }
    if (typeof val.urls === 'object') {
      grabUrls = true;
    }
    if (typeof val.zalgo === 'object') {
      grabZalgo = true;
    }
    if (Array.isArray(val.words)) {
      grabWords = true;
    }
    if (Array.isArray(val.tokens)) {
      grabTokens = true;
    }
    if (typeof val.caps === 'object') {
      grabCaps = true;
    }
    if (typeof val.chars === 'object') {
      grabChars = true;
    }
    if (typeof val.stop === 'boolean' && val.stop === true) {
      break;
    }
  }
  const data = await getCensorshipData(visibleName, grabInvites, grabUrls, grabZalgo);
  for (let i = 0; i < appConfigs.length; i += 1) {
    const extraData = await getDataFromConfig(visibleName, appConfigs[i], grabWords, grabTokens, grabCaps, grabChars);
    const _newd = { ...data, ...extraData };
    const check = checkCensors(_newd, appConfigs[i]);
    if (check instanceof CensorCheck) {
      if (check.check === true) {
        await member.edit({ nick: `censored name (${Math.max(9999, Math.min(Math.random() * 1000), 1000).toString()})` });
        await logCustom('CENSOR', 'CENSORED_MESSAGE', new Map([['_CENSOR_TYPE_', check.type], ['_CENSOR_MESSAGE_', check.message], ['_CENSOR_TARGET_', typeof check.target !== 'undefined' ? check.target : 'unknown'], ['_USERTAG_', getMemberTag(member)], ['_USER_ID_', member.user.id]]));
        return false;
      }
      if (check.stop === true) {
        break;
      }
    }
  }
}

export async function AL_OnGuildMemberAdd( // Only provides logs if joined member is a bot
  id: string,
  gid: string,
  log: any,
  member: discord.GuildMember,
) {
  if (log instanceof discord.AuditLogEntry) {
    return;
  }
  const _ret = await checkName(member);
  return _ret;
}

export async function AL_OnGuildMemberUpdate(
  id: string,
  gid: string,
  log: any,
  member: discord.GuildMember,
  oldMember: discord.GuildMember,
) {
  if (!(log instanceof discord.AuditLogEntry) || oldMember === null || member.user.bot === true) {
    return;
  }
  if (log.userId !== member.user.id) {
    return;
  }
  if (member.user.username === oldMember.user.username && member.nick === oldMember.nick) {
    return;
  }
  const visibleName = typeof member.nick === 'string' && member.nick.length > 0 ? member.nick : member.user.username;
  const visibleNameOld = typeof oldMember.nick === 'string' && oldMember.nick.length > 0 ? oldMember.nick : oldMember.user.username;
  if (visibleName === visibleNameOld) {
    return;
  }
  const _ret = await checkName(member);
  return _ret;
}
