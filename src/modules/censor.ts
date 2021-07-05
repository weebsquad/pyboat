import { config, guildId, ConfigError } from '../config';
import { UrlRegex, InviteRegex, ZalgoRegex, AsciiRegex, emojiv2 } from '../constants/constants';
import * as utils from '../lib/utils';
import { logCustom } from './logging/events/custom';
import { getMemberTag } from './logging/main';
import * as infractions from './infractions';
import * as admin from './admin';
import { language as i18n, setPlaceholders } from '../localization/interface';

const EXTRA_ASCII_WHITELIST = ['€', '£', '»', '«', '´', '¨', 'º', 'ª', 'ç'];
const VALID_ACTIONS_INDIVIDUAL = ['KICK', 'SOFTBAN', 'BAN', 'MUTE', 'TEMPMUTE', 'TEMPBAN'];
const VALID_ACTIONS_GLOBAL = ['SLOWMODE', 'MASSBAN', 'LOCK_GUILD', 'LOCK_CHANNEL'];
const MAX_POOL_ENTRY_LIFETIME = 120 * 1000;

export const kvPool = new utils.StoragePool({
  name: 'censor',
  itemDuration: MAX_POOL_ENTRY_LIFETIME,
  idProperty: 'id',
  timestampProperty: 'ts',
  local: true,
});

class PoolEntry {
  ts: number;
  key: string;
  member: string;
  constructor(key: string, member: string) {
    this.ts = Date.now();
    this.key = key;
    this.member = member;
    return this;
  }
}

enum CensorType {
    'INVITE'= 'invite',
    'URL' = 'url',
    'ZALGO' = 'zalgo',
    'WORD' = 'word',
    'TOKEN' = 'token',
    'CAPS' = 'caps',
    'CHAR' = 'char',
    'REGEX' = 'regex'
}
class CensorCheck {
    target: string | undefined;
    type: CensorType | undefined;
    message: string | undefined;
    stop = false;
    check = false;
    constructor(check: boolean, type: CensorType | undefined, message: string | undefined, target: string | undefined = undefined, stop: boolean | undefined = false) {
      this.check = check;
      this.type = type;
      this.message = message;
      this.target = target;
      this.stop = stop;
      return this;
    }
}

export async function getViolations(member: string | null) {
  const vl = await kvPool.getByQuery<PoolEntry>({ member: member !== null ? member : undefined });
  return vl;
}
export async function checkViolations(id: string, noServerActions: boolean, key: string, member: string, conf: any) {
  const now = Date.now();
  // const diff = now - timestamp;
  const violations = await getViolations(null);
  const memberViolations = violations.filter((e) => e.member === member);
  if ((typeof conf.globalViolations === 'object' && typeof conf.globalViolations.trigger === 'string' && typeof conf.globalViolations.action === 'string' && conf.globalViolations.trigger.includes('/') && VALID_ACTIONS_GLOBAL.includes(conf.globalViolations.action.toUpperCase())) && (!noServerActions || conf.globalViolations.action.toUpperCase() === 'MASSBAN')) {
    const action = conf.globalViolations.action.toUpperCase();
    if (['LOCK_CHANNEL', 'LOCK_GUILD', 'SLOWMODE'].includes(action) && typeof conf.globalViolations.actionDuration !== 'string') {
      throw new ConfigError(`config.modules.censor.${conf._key}.globalViolations.actionDuration`, 'Incorrect formatting');
    }
    if (action === 'SLOWMODE' && typeof conf.globalViolations.actionValue !== 'number') {
      throw new ConfigError(`config.modules.censor.${conf._key}.globalViolations.actionValue`, 'Incorrect formatting');
    }
    const dur = typeof conf.globalViolations.actionValue === 'number' ? Math.min(21600, conf.globalViolations.actionValue) : undefined;
    const { trigger } = conf.globalViolations;
    let triggerCount = trigger.split('/')[0];
    let triggerSeconds = trigger.split('/')[1];
    if (!utils.isNormalInteger(triggerCount, true) || !utils.isNormalInteger(triggerSeconds, true)) {
      throw new ConfigError(`config.modules.censor.${conf._key}.globalViolations.trigger`, 'Incorrect formatting');
    }
    if (triggerCount === '0' || triggerSeconds === '0') {
      return false;
    }
    triggerCount = parseInt(triggerCount, 10);
    triggerSeconds = Math.min(Math.floor(MAX_POOL_ENTRY_LIFETIME / 1000), parseInt(triggerSeconds, 10));
    const individuals: string[] = [];
    const indNeeded = Math.min(10, Math.max(2, Math.floor(triggerCount / 3)));
    const compare = now - (Math.floor(triggerSeconds * 1000));
    const matchesThis = violations.filter((e) => {
      if (!individuals.includes(e.member)) {
        individuals.push(e.member);
      }
      return e.ts > compare;
    });
    if (matchesThis.length >= triggerCount && individuals.length >= indNeeded) {
      return {
        action,
        actionDuration: typeof conf.globalViolations.actionDuration === 'string' ? conf.globalViolations.actionDuration : undefined,
        actionValue: dur,
        individuals: action === 'MASSBAN' ? individuals : undefined,
      };
    }
  }
  if (typeof conf.violations === 'object' && typeof conf.violations.trigger === 'string' && typeof conf.violations.action === 'string' && conf.violations.trigger.includes('/') && VALID_ACTIONS_INDIVIDUAL.includes(conf.violations.action.toUpperCase())) {
    const action = conf.violations.action.toUpperCase();
    if (['TEMPMUTE', 'TEMPBAN'].includes(action) && typeof conf.violations.actionDuration !== 'string') {
      throw new ConfigError(`config.modules.censor.${conf._key}.violations.actionDuration`, 'Incorrect formatting');
    }
    const { trigger } = conf.violations;
    let triggerCount = trigger.split('/')[0];
    let triggerSeconds = trigger.split('/')[1];
    if (!utils.isNormalInteger(triggerCount, true) || !utils.isNormalInteger(triggerSeconds, true)) {
      throw new ConfigError(`config.modules.censor.${conf._key}.violations.trigger`, 'Incorrect formatting');
    }
    if (triggerCount === '0' || triggerSeconds === '0') {
      return false;
    }
    triggerCount = parseInt(triggerCount, 10);
    triggerSeconds = Math.min(Math.floor(MAX_POOL_ENTRY_LIFETIME / 1000), parseInt(triggerSeconds, 10));
    const compare = now - (Math.floor(triggerSeconds * 1000));
    const matchesThis = memberViolations.filter((e) => e.ts > compare);
    if (matchesThis.length >= triggerCount) {
      return {
        action,
        actionDuration: typeof conf.violations.actionDuration === 'string' ? conf.violations.actionDuration : undefined,
      };
    }
  }

  return false;
}
export async function addViolation(id: string, key: string, member: string) {
  const newVio = new PoolEntry(key, member);
  newVio.ts = utils.decomposeSnowflake(id).timestamp;
  await kvPool.saveToPool(newVio);
}
export function getApplicableConfigs(member: discord.GuildMember, channel: discord.GuildChannel | undefined = undefined): Array<any> {
  const toret = [];
  const cfgMod = config.modules.censor;
  if (typeof channel !== 'undefined' && typeof cfgMod.channels === 'object' && Object.keys(cfgMod.channels).includes(channel.id)) {
    toret.push({ _key: `channel_${channel.id}`, ...cfgMod.channels[channel.id] });
  }
  if (typeof channel !== 'undefined' && typeof channel.parentId === 'string' && channel.parentId !== '' && channel.type !== discord.Channel.Type.GUILD_CATEGORY && typeof cfgMod.categories === 'object' && Object.keys(cfgMod.categories).includes(channel.parentId)) {
    toret.push({ _key: `category_${channel.parentId}`, ...cfgMod.categories[channel.parentId] });
  }
  if (typeof cfgMod.levels === 'object') {
    const auth = utils.getUserAuth(member);
    Object.keys(cfgMod.levels).map((item) => (utils.isNumber(item) && utils.isNormalInteger(item) ? parseInt(item, 10) : -1)).sort().reverse()
      .map((lvl) => {
        if (typeof lvl === 'number' && lvl >= auth && lvl >= 0) {
          toret.push({ _key: `level_${lvl.toString()}`, ...cfgMod.levels[lvl] });
        }
      });
  }
  return toret;
}
export async function getCensorshipData(txt: string, checkInvites = false, checkUrls = false, checkZalgo = false) {
  const toret: {[key: string]: any[] | undefined} = {
    invites: checkInvites === true ? [] : undefined,
    urls: checkUrls === true ? [] : undefined,
    zalgo: checkZalgo === true ? [] : undefined,
  };
  if (checkInvites === true && Array.isArray(toret.invites)) {
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
            toret.invites!.push(thisInv);
          }
        }));
        _invs = _invs.filter((code) => {
          const _f = toret.invites!.find((e) => e instanceof discord.Invite && e.code === code);
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
export async function getDataFromConfig(txt: string, thisCfg: any, checkWords = false, checkTokens = false, checkCaps = false, checkChars = false, checkRegex = false) {
  const toRet: any = {
    words: checkWords === true ? [] : undefined,
    tokens: checkTokens === true ? [] : undefined,
    caps: checkCaps === true ? [] : undefined,
    chars: checkChars === true ? [] : undefined,
    regex: checkRegex === true ? [] : undefined,
  };
  if (checkWords === true) {
    const blocks = thisCfg.words.filter((w: any) => typeof w === 'string' && w.length > 0);
    let found = [];
    let splitting = txt.includes(' ') ? txt.toLowerCase().split(' ') : [txt.toLowerCase()];
    if (txt.includes('\n')) {
      const topush: any = [];
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
    const checks = thisCfg.tokens.filter((w: any) => typeof w === 'string' && w.length > 0);
    if (checks.length > 0) {
      const blocks: any = txt.toLowerCase().match(new RegExp(checks.join('|'), 'gi'));
      if (Array.isArray(blocks) && blocks.length > 0) {
        toRet.tokens = blocks;
      }
    }
  }
  if (checkCaps === true) {
    const minLength = typeof thisCfg.caps.minLength === 'number' ? thisCfg.caps.minLength : 5;
    if (txt.length >= minLength && minLength > 0) {
      const matches = txt.match(/[A-z]/gi);
      if (Array.isArray(matches) && matches.length > 0) {
        if (typeof thisCfg.caps.percentage === 'number' && thisCfg.caps.percentage > 1) {
          const thisCapped = matches.filter((e) => e.toUpperCase() === e).length;
          const thisPct = Math.floor((thisCapped / matches.length) * 100);
          if (thisPct > thisCfg.caps.percentage) {
            toRet.caps.push(`${thisPct}% / ${thisCfg.caps.percentage}%`);
          }
        }
        if (typeof thisCfg.caps.followed === 'number' && thisCfg.caps.followed > 1) {
          let inARow = 0;
          for (let i = 0; i < matches.length; i += 1) {
            const thisc = matches[i];
            if (thisc.toUpperCase() === matches[i]) {
              inARow += 1;
            } else {
              inARow = 0;
            }
            if (inARow >= thisCfg.caps.followed) {
              toRet.caps.push(setPlaceholders(i18n.modules.censor.capitals_followed, ['capitals', inARow.toString()]));
              break;
            }
          }
        }
      }
    }
  }
  if (checkChars === true) {
    const charCfg = thisCfg.chars;
    if (typeof charCfg.limit === 'number' && charCfg.limit > 0 && txt.length > charCfg.limit) {
      toRet.chars.push(`${txt.length}/${charCfg.limit} characters`);
    }
    if (typeof charCfg.newLines === 'number' && charCfg.newLines > 0 && txt.includes('\n')) {
      const newlines = txt.split('\n').length - 1;
      if (newlines > charCfg.newLines) {
        toRet.chars.push(setPlaceholders(i18n.modules.censor.capitals_followed, ['found', newlines.toString(), 'max', charCfg.newlines.toString()]));
      }
    }

    if (typeof charCfg.nonAscii === 'boolean' && charCfg.nonAscii === true) {
      let asciiremoved = txt.match(AsciiRegex);
      const emj = txt.match(emojiv2);
      if (Array.isArray(asciiremoved)) {
        asciiremoved = asciiremoved.filter((char) => !EXTRA_ASCII_WHITELIST.includes(char));
        if (Array.isArray(emj)) {
          asciiremoved = asciiremoved.filter((char) => !emj.includes(char));
        }
      }
      if (Array.isArray(asciiremoved) && asciiremoved.length > 0) {
        toRet.chars.push(setPlaceholders(i18n.modules.censor.illegal_ascii, ['ascii', asciiremoved.join(', ')]));
      }
    }
  }
  if (checkRegex) {
    thisCfg.regex.forEach((rgx: string) => {
      const rgxMatch = txt.match(new RegExp(rgx, 'gm'));
      if (Array.isArray(rgxMatch)) {
        toRet.regex.push(...rgxMatch);
      }
    });
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
  const { regex } = data;
  if (typeof thisCfg.invites === 'object' && Array.isArray(invites) && invites.length > 0) {
    const invCfg = thisCfg.invites;
    const allowVanities = typeof invCfg.vanityUrl === 'boolean' ? invCfg.vanityUrl : false;
    const allowSelf = typeof invCfg.self === 'boolean' ? invCfg.self : false;
    const allowedGuilds = typeof invCfg.whitelist === 'object' && Array.isArray(invCfg.whitelist.guilds) && invCfg.whitelist.guilds.length > 0 ? invCfg.whitelist.guilds : null;
    const deniedGuilds = typeof invCfg.blacklist === 'object' && Array.isArray(invCfg.blacklist.guilds) ? invCfg.blacklist.guilds : [];
    const allowedCodes = typeof invCfg.whitelist === 'object' && Array.isArray(invCfg.whitelist.codes) && invCfg.whitelist.codes.length > 0 ? invCfg.whitelist.codes : null;
    const deniedCodes = typeof invCfg.blacklist === 'object' && Array.isArray(invCfg.blacklist.codes) ? invCfg.blacklist.codes : [];

    if (invites.length > 5) {
      return new CensorCheck(true, CensorType.INVITE, i18n.modules.censor.too_many_codes, undefined, _stop);
    }

    for (let i = 0; i < invites.length; i++) {
      const inv: string | discord.Invite = invites[i];
      if (!(inv instanceof discord.Invite)) {
        if (deniedCodes.length > 0 && deniedCodes.includes(inv)) {
          return new CensorCheck(true, CensorType.INVITE, i18n.modules.censor.invite_in_blocklist, inv, _stop);
        }
        continue;
      }
      if (!inv.guild) {
        continue;
      }
      if (Array.isArray(allowedGuilds) && !allowedGuilds.includes(inv.guild.id)) {
        if (!(inv.guild.id === guildId && allowSelf === true) && !(inv.guild.vanityUrlCode !== null && typeof inv.guild.vanityUrlCode === 'string' && inv.guild.vanityUrlCode.length >= 2 && allowVanities === true)) {
          return new CensorCheck(true, CensorType.INVITE, i18n.modules.censor.guild_not_allowed, inv.guild.id, _stop);
        }
      }
      if (deniedGuilds.length > 0 && deniedGuilds.includes(inv.guild.id)) {
        return new CensorCheck(true, CensorType.INVITE, i18n.modules.censor.guild_in_blocklist, inv.guild.id, _stop);
      }
      if (Array.isArray(allowedCodes) && !allowedCodes.includes(inv)) {
        if (!(inv.guild.id === guildId && allowSelf === true) && !(inv.guild.vanityUrlCode !== null && typeof inv.guild.vanityUrlCode === 'string' && inv.guild.vanityUrlCode.length >= 2 && allowVanities === true)) {
          return new CensorCheck(true, CensorType.INVITE, i18n.modules.censor.invite_not_allowed, inv.guild.id, _stop);
        }
      }
      if (deniedCodes.length > 0 && deniedCodes.includes(inv)) {
        return new CensorCheck(true, CensorType.INVITE, i18n.modules.censor.invite_in_blocklist, inv.guild.id, _stop);
      }
    }
  }

  if (typeof thisCfg.urls === 'object' && Array.isArray(urls) && urls.length > 0) {
    const urlCfg = thisCfg.urls;
    const allowSubdomains = typeof urlCfg.allowSubdomains === 'boolean' ? urlCfg.allowSubdomains : false;
    const allowed = typeof urlCfg.whitelist === 'object' && Array.isArray(urlCfg.whitelist) && urlCfg.whitelist.length > 0 ? urlCfg.whitelist : null;
    const denied = typeof urlCfg.blacklist === 'object' && Array.isArray(urlCfg.blacklist) ? urlCfg.blacklist : [];
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];
      const host = url.hostname;
      if (denied.includes(host)) {
        return new CensorCheck(true, CensorType.URL, i18n.modules.censor.domain_in_blocklist, host, _stop);
      }
      if (Array.isArray(allowed) && !allowed.includes(host)) {
        if (allowSubdomains === true && host.includes('.') && host.split('.').length > 2) {
          const splitted = host.split('.');
          const actualDomain = `${splitted[splitted.length - 2]}.${splitted[splitted.length - 1]}`;
          if (allowed.includes(actualDomain) && !denied.includes(actualDomain)) {
            continue;
          }
        }
        return new CensorCheck(true, CensorType.URL, i18n.modules.censor.domain_not_allowed, host, _stop);
      }
    }
  }
  if ((typeof thisCfg.zalgo === 'object' || thisCfg.zalgo === true) && Array.isArray(zalgo) && zalgo.length > 0) {
    return new CensorCheck(true, CensorType.ZALGO, i18n.modules.censor.zalgo_found, zalgo.length.toString(), _stop);
  }
  if (typeof thisCfg.words === 'object' && Array.isArray(words) && words.length > 0) {
    return new CensorCheck(true, CensorType.WORD, i18n.modules.censor.blocked_words, words.join(', '), _stop);
  }
  if (typeof thisCfg.tokens === 'object' && Array.isArray(tokens) && tokens.length > 0) {
    return new CensorCheck(true, CensorType.TOKEN, i18n.modules.censor.blocked_tokens, tokens.join(', '), _stop);
  }
  if (typeof thisCfg.caps === 'object' && Array.isArray(caps) && caps.length > 0) {
    return new CensorCheck(true, CensorType.CAPS, i18n.modules.censor.too_many_caps, caps.join(', '), _stop);
  }
  if (typeof thisCfg.chars === 'object' && Array.isArray(chars) && chars.length > 0) {
    return new CensorCheck(true, CensorType.CHAR, i18n.modules.censor.illegal_chars, chars.join(', '), _stop);
  }
  if (typeof thisCfg.regex === 'object' && Array.isArray(regex) && regex.length > 0) {
    return new CensorCheck(true, CensorType.REGEX, i18n.modules.censor.invalid_regex, regex.join(', '), _stop);
  }
  return new CensorCheck(false, undefined, undefined, undefined, _stop);
}
export async function processViolations(id: string, member: discord.GuildMember, channel: discord.GuildTextChannel | discord.GuildNewsChannel | undefined, conf: any) {
  await addViolation(id, conf._key, member.user.id);
  const guild = await member.getGuild();
  const isVio = await checkViolations(id, false, conf._key, member.user.id, conf);
  if (isVio === false) {
    return;
  }

  const checkMember = await guild.getMember(member.user.id);
  if (checkMember === null) {
    return;
  }
  const objs: any[] = [];
  const { action, actionDuration, actionValue, individuals } = isVio;
  switch (action) {
    case 'KICK':
      await infractions.Kick(member, null, i18n.modules.censor.action_reason);
      break;
    case 'SOFTBAN':
      await infractions.SoftBan(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, i18n.modules.censor.action_reason);
      break;
    case 'MUTE':
      await infractions.Mute(member, null, i18n.modules.censor.action_reason);
      break;
    case 'BAN':
      await infractions.Ban(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, i18n.modules.censor.action_reason);
      break;
    case 'TEMPMUTE':
      await infractions.TempMute(member, null, actionDuration, i18n.modules.censor.action_reason);
      break;
    case 'TEMPBAN':
      await infractions.TempBan(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, actionDuration, i18n.modules.censor.action_reason);
      break;
    case 'SLOWMODE':
      await admin.SlowmodeChannel(null, channel!, actionValue!, utils.timeArgumentToMs(actionDuration), i18n.modules.censor.action_reason);
      break;
    case 'LOCK_CHANNEL':
      await admin.LockChannel(null, channel!, true, utils.timeArgumentToMs(actionDuration), i18n.modules.censor.action_reason);
      break;
    case 'LOCK_GUILD':
      await admin.LockGuild(null, true, utils.timeArgumentToMs(actionDuration), i18n.modules.censor.action_reason);
      break;
    case 'MASSBAN':

      await Promise.all(individuals!.map(async (ido) => {
        const gm = await guild.getMember(ido);
        if (gm !== null) {
          objs.push(gm);
          return;
        }
        const usr = await utils.getUser(ido);
        if (usr !== null) {
          objs.push(usr);
        }
      }));
      await infractions.MassBan(objs, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, i18n.modules.censor.action_reason);
      break;
    default:
      break;
  }
}

export async function censorMessage(message: discord.GuildMemberMessage, check: CensorCheck, conf: any) {
  const channel = await message.getChannel();
  if (!channel) {
    return;
  }
  await processViolations(message.id, message.member, channel, conf);
  await message.delete();
  logCustom('CENSOR', 'CENSORED_MESSAGE', new Map([['CENSOR_TP', check.type], ['CENSOR_MESSAGE', check.message], ['CENSOR_TARGET', typeof check.target !== 'undefined' ? check.target : 'unknown'], ['MESSAGE_ID', message.id], ['CHANNEL_ID', message.channelId], ['USERTAG', getMemberTag(message.member)], ['USER_ID', message.author.id]]));
}
export async function checkMessage(message: discord.Message.AnyMessage) {
  if (message.guildId === null || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT || message.webhookId !== null || !message.author || message.author.bot === true || message.flags !== 0) {
    return;
  }
  if (!(message instanceof discord.GuildMemberMessage)) {
    return;
  }
  if (utils.isGlobalAdmin(message.author.id) && guildId !== '307927177154789386') {
    return;
  }
  if (message.author.id === discord.getBotId()) {
    return;
  }
  const channel = await message.getChannel();
  if (channel === null) {
    return;
  }
  const me = await (await channel.getGuild()).getMember(discord.getBotId());
  if (!me) {
    return;
  }
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
  let grabRegex = false;
  for (let i = 0; i < appConfigs.length; i += 1) {
    const val = appConfigs[i];
    if (typeof val.invites === 'object') {
      grabInvites = true;
    }
    if (typeof val.urls === 'object') {
      grabUrls = true;
    }
    if (typeof val.zalgo === 'object' || val.zalgo === true) {
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
    if (typeof val.regex === 'object') {
      grabRegex = true;
    }
    if (typeof val.stop === 'boolean' && val.stop === true) {
      break;
    }
  }
  const dataContent = await getCensorshipData(message.content, grabInvites, grabUrls, grabZalgo);
  const dataAttach: any = {};
  if (message.attachments.length > 0) {
    await Promise.all(message.attachments.map(async (attach) => {
      if (typeof dataAttach[attach.filename] !== 'undefined') {
        return;
      }
      const _thisData = await getCensorshipData(attach.filename, grabInvites, grabUrls, grabZalgo);
      dataAttach[attach.filename] = _thisData;
    }));
  }

  for (let i = 0; i < appConfigs.length; i += 1) {
    const extraDataContent = await getDataFromConfig(message.content, appConfigs[i], grabWords, grabTokens, grabCaps, grabChars, grabRegex);
    // attachments
    if (Object.keys(dataAttach).length > 0) {
      for (const key in dataAttach) {
        const val = dataAttach[key];
        const extraDataAttach = await getDataFromConfig(key, appConfigs[i], grabWords, grabTokens, grabCaps, grabChars, grabRegex);
        const _newd = { ...val, ...extraDataAttach };
        const check = checkCensors(_newd, appConfigs[i]);
        if (check instanceof CensorCheck) {
          if (check.check === true) {
            await censorMessage(message, check, appConfigs[i]);
            return false;
          }
          if (check.stop === true) {
            break;
          }
        }
      }
    }
    // normal content
    const _newd = { ...dataContent, ...extraDataContent };
    const check = checkCensors(_newd, appConfigs[i]);
    if (check instanceof CensorCheck) {
      if (check.check === true) {
        await censorMessage(message, check, appConfigs[i]);
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

export async function checkName(eventId: string, member: discord.GuildMember) {
  if (utils.isGlobalAdmin(member.user.id) && guildId !== '307927177154789386') {
    return;
  }
  if (member.user.id === discord.getBotId()) {
    return;
  }
  const guild = await member.getGuild();
  if (guild === null) {
    return;
  }
  const me = await guild.getMember(discord.getBotId());
  if (me === null) {
    return;
  }
  if (!me.can(discord.Permissions.MANAGE_NICKNAMES)) {
    return;
  }
  const myHighest = await utils.getMemberHighestRole(me);
  const memberHighest = await utils.getMemberHighestRole(member);
  if (myHighest.position <= memberHighest.position) {
    return;
  }
  const visibleName = typeof member.nick === 'string' && member.nick.length > 0 ? member.nick : member.user.username;

  const cfgMod = config.modules.censor;
  if (typeof cfgMod.nameChecks !== 'object') {
    return;
  }
  const appConfigs: any[] = [];
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
  let grabRegex = false;
  for (let i = 0; i < appConfigs.length; i += 1) {
    const val = appConfigs[i];
    if (typeof val.invites === 'object') {
      grabInvites = true;
    }
    if (typeof val.urls === 'object') {
      grabUrls = true;
    }
    if (typeof val.zalgo === 'object' || val.zalgo === true) {
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
    if (typeof val.regex === 'object') {
      grabRegex = true;
    }
    if (typeof val.stop === 'boolean' && val.stop === true) {
      break;
    }
  }
  const data = await getCensorshipData(visibleName, grabInvites, grabUrls, grabZalgo);
  for (let i = 0; i < appConfigs.length; i += 1) {
    const extraData = await getDataFromConfig(visibleName, appConfigs[i], grabWords, grabTokens, grabCaps, grabChars, grabRegex);
    const _newd = { ...data, ...extraData };
    const check = checkCensors(_newd, appConfigs[i]);
    if (check instanceof CensorCheck) {
      if (check.check === true) {
        await member.edit({ nick: setPlaceholders(i18n.modules.censor.censored_name, ['number', Math.floor(Math.min(9999, 1000 + (Math.random() * 10000))).toString()]) });
        logCustom('CENSOR', 'CENSORED_USERNAME', new Map([['CENSOR_TP', check.type], ['CENSOR_MESSAGE', check.message], ['OLD_NAME', utils.escapeString(visibleName, true)], ['CENSOR_TARGET', typeof check.target !== 'undefined' ? check.target : 'unknown'], ['USERTAG', getMemberTag(member)], ['USER_ID', member.user.id]]));
        await processViolations(eventId, member, undefined, appConfigs[i]);
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
  const _ret = await checkName(id, member);
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
  const _ret = await checkName(id, member);
  return _ret;
}
