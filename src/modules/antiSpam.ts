/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-async-promise-executor */

import { ConfigError, guildId, config } from '../config';
import * as utils from '../lib/utils';
import * as infractions from './infractions';
import { AsciiRegex, UrlRegex, emojiv2 } from '../constants/discord';
import * as antiping from './antiPing';
import * as constants from '../constants/constants';
import { logCustom } from './logging/events/custom';
import { getUserTag } from './logging/main';
import * as admin from './admin';
import { language as i18n, setPlaceholders } from '../localization/interface';

const removeWhenComparing = ['\n', '\r', '\t', ' '];

const VALID_ACTIONS_INDIVIDUAL = ['KICK', 'SOFTBAN', 'BAN', 'MUTE', 'TEMPMUTE', 'TEMPBAN'];
const VALID_ACTIONS_GLOBAL = ['LOCK_GUILD'];
const MAX_POOL_ENTRY_LIFETIME = 120 * 1000;

export const pools = new utils.StoragePool('antiSpam', MAX_POOL_ENTRY_LIFETIME, 'id', 'ts', undefined, undefined, true);
class MessageEntry {
    authorId: string;
    id: string;
    channelId: string;
    deleted = false;
    ts: number;
    content: string;
    characters: number | undefined = undefined;
    attachments: number | undefined = undefined;
    // attachmentHashes: Array<string> | undefined = undefined;
    newlines: number | undefined = undefined;
    mentions: number | undefined = undefined;
    links: number | undefined = undefined;
    emoji: number | undefined = undefined;
    constructor(message: discord.GuildMemberMessage) {
      this.attachments = message.attachments.length > 0 ? message.attachments.length : undefined;
      this.authorId = message.author.id;
      this.channelId = message.channelId;
      this.id = message.id;
      this.ts = utils.decomposeSnowflake(this.id).timestamp;
      this.content = cleanString(message.content);
      this.characters = message.content.length;
      this.mentions = message.mentions.length > 0 ? message.mentions.length : undefined;
      if (message.content.includes('\n')) {
        this.newlines = message.content.split('\n').length - 1;
      }
      const links = message.content.match(UrlRegex);
      if (Array.isArray(links) && links.length > 0) {
        this.links = links.length;
      }
      let emj = 0;
      /* const normalEmoji1 = message.content.match(new RegExp('[\uD83C-\uDBFF\uDC00-\uDFFF]+', 'giu'));
      if (Array.isArray(normalEmoji1)) {
        emj += normalEmoji1.length;
      } */

      let emojiCheck = message.content.match(new RegExp(emojiv2, 'g'));
      if (Array.isArray(emojiCheck)) {
        emojiCheck = emojiCheck.filter((val) => !utils.isNormalInteger(val));
        emj += emojiCheck.length;
      }
      const customEmoji = message.content.match(new RegExp(constants.EmojiRegex, 'gi'));
      if (Array.isArray(customEmoji)) {
        emj += customEmoji.length;
      }
      if (emj > 0) {
        this.emoji = emj;
      }
      return this;
    }
}
export function getApplicableConfigs(member: discord.GuildMember, channel: discord.GuildChannel | undefined = undefined): Array<any> {
  const toret = [];
  const cfgMod = config.modules.antiSpam;
  const auth = utils.getUserAuth(member);
  if (typeof cfgMod.antiRaid === 'object') {
    Object.keys(cfgMod.antiRaid).map((item) => (utils.isNumber(item) && utils.isNormalInteger(item) ? parseInt(item, 10) : -1)).sort().reverse()
      .map((lvl) => {
        if (typeof lvl === 'number' && lvl >= auth && lvl >= 0) {
          toret.push({ _key: `antiRaid_${lvl}`, ...cfgMod.antiRaid[lvl] });
        }
      });
  }
  if (typeof channel !== 'undefined' && typeof cfgMod.channels === 'object' && Object.keys(cfgMod.channels).includes(channel.id)) {
    toret.push({ _key: `channel_${channel.id}`, ...cfgMod.channels[channel.id] });
  }
  if (typeof channel !== 'undefined' && typeof channel.parentId === 'string' && channel.parentId !== '' && channel.type !== discord.Channel.Type.GUILD_CATEGORY && typeof cfgMod.categories === 'object' && Object.keys(cfgMod.categories).includes(channel.parentId)) {
    toret.push({ _key: `category_${channel.parentId}`, ...cfgMod.categories[channel.parentId] });
  }
  if (typeof cfgMod.levels === 'object') {
    Object.keys(cfgMod.levels).map((item) => (utils.isNumber(item) && utils.isNormalInteger(item) ? parseInt(item, 10) : -1)).sort().reverse()
      .map((lvl) => {
        if (typeof lvl === 'number' && lvl >= auth && lvl >= 0) {
          toret.push({ _key: `level_${lvl}`, ...cfgMod.levels[lvl] });
        }
      });
  }
  return toret;
}

export function cleanString(str: string) {
  let _str = `${str}`;
  _str = _str.toLowerCase().replace(AsciiRegex, '');
  removeWhenComparing.forEach((e) => {
    if (_str.includes(e)) {
      _str = _str.split(e).join('');
    }
  });
  return _str;
}
export function checkDuplicateContent(msg: discord.GuildMemberMessage, items: Array<MessageEntry>): Array<MessageEntry> {
  let toRet = [];
  const cleanContent = cleanString(msg.content);
  toRet = items.filter((item) => {
    if (msg.id === item.id) {
      return false;
    }
    const thisCont = item.content;
    const len = thisCont.length;
    if (len === 0 && item.attachments > 0) {
      return false;
    }
    if (len < 4) {
      return thisCont === cleanContent;
    }
    const similarity = (utils.stringSimilarity(cleanContent, thisCont)) * 100;
    return similarity > 90;
  });
  return toRet;
}
export function exceedsThreshold(items: Array<MessageEntry>, key: string, allowed: number, after: number, individualsNeeded: number | undefined = undefined) {
  if (typeof individualsNeeded !== 'number') {
    individualsNeeded = 0;
  }
  let _matches = 0;
  let indivs = [];
  items.every((item) => {
    if (!indivs.includes(item.authorId)) {
      indivs.push(item.authorId);
    }
    if (item.ts < after) {
      return true;
    }
    if (typeof item[key] === 'number') {
      _matches += item[key];
    }
    if (_matches >= allowed && indivs.length >= individualsNeeded) {
      return false;
    }
    return true;
  });
  indivs = [...new Set(indivs)]; // just to be sure, lol
  return _matches >= allowed && indivs.length >= individualsNeeded;
}
export async function doChecks(msg: discord.GuildMemberMessage) {
  let flaggedOnce = false;
  let flaggedAntiraid = false;
  const msgTs = utils.decomposeSnowflake(msg.id).timestamp;
  const channel = await msg.getChannel();
  const guild = await msg.getGuild();
  const { member } = msg;
  if (channel === null || guild === null) {
    return;
  }
  const previous = await pools.getByQuery<MessageEntry>({ authorId: msg.author.id });
  let thisObj = previous.find((e) => e.id === msg.id);
  if (previous.length === 0) {
    return;
  }
  if (!thisObj) {
    previous.push(new MessageEntry(msg));
    thisObj = previous.find((e) => e.id === msg.id);
  }
  const appConfigs = getApplicableConfigs(member, channel);
  if (appConfigs.length === 0) {
    return;
  }
  const normalKeysCheck = ['newlines', 'attachments', 'emoji', 'mentions', 'links', 'characters'];
  let flagged = [];
  let messageRemovedCount = 0;
  for (let i = 0; i < appConfigs.length; i += 1) {
    const thisCfg = appConfigs[i];
    let theseItems = previous;
    if (thisCfg._key.includes('channel_') || thisCfg._key.includes('category_')) {
      theseItems = previous.filter((e) => e.channelId === msg.channelId);
    }
    if (thisCfg._key.includes('antiRaid_')) {
      theseItems = await pools.getAll();
    }
    // theseItems = theseItems.filter((item) => !item.deleted);
    flaggedAntiraid = thisCfg._key.includes('antiRaid');
    flagged = normalKeysCheck.filter((check) => {
      if (typeof thisCfg[check] !== 'string') {
        return false;
      }
      if (typeof thisObj[check] !== 'number' || thisObj[check] < 1) {
        return false;
      }
      const trigger = thisCfg[check];
      if (!trigger.includes('/')) {
        return false;
      }
      if (!utils.isNormalInteger(trigger.split('/')[0]) || !utils.isNormalInteger(trigger.split('/')[1])) {
        return false;
      }
      if (trigger.split('/')[0] === '0' || trigger.split('/')[1] === '0') {
        return false;
      }
      const count = Math.min(MAX_POOL_ENTRY_LIFETIME, +trigger.split('/')[0]);
      const dur = Math.floor((+trigger.split('/')[1]) * 1000);
      const after = msgTs - dur;
      return exceedsThreshold(theseItems, check, count, after, thisCfg._key.includes('antiRaid_') ? Math.min(10, Math.max(2, Math.floor(count / 3))) : undefined);
    });
    let duplicateMessages: undefined | Array<MessageEntry>;
    let repeatedMessages: undefined | Array<MessageEntry>;
    if (typeof thisCfg.messages === 'string') {
      const trigger = thisCfg.messages;
      if (trigger.includes('/')) {
        if (trigger.split('/')[0] !== '0' && trigger.split('/')[1] !== '0') {
          const count = Math.min(MAX_POOL_ENTRY_LIFETIME, +trigger.split('/')[0]);
          const dur = Math.floor((+trigger.split('/')[1]) * 1000);
          const after = msgTs - dur;
          let individuals = [];
          const needed = Math.max(2, Math.floor(count / 3));
          repeatedMessages = theseItems.filter((item) => {
            if (!individuals.includes(item.authorId)) {
              individuals.push(item.authorId);
            }
            return item.ts >= after;
          });
          individuals = [...new Set(individuals)];
          if (repeatedMessages.length >= count && (!thisCfg._key.includes('antiRaid_') || individuals.length >= needed)) {
            flagged.push('messages');
          }
        }
      }
    }
    /*
    if (typeof thisCfg.duplicateMessages === 'string') {
      const trigger = thisCfg.duplicateMessages;
      if (trigger.includes('/')) {
        if (trigger.split('/')[0] !== '0' && trigger.split('/')[1] !== '0') {
          duplicateMessages = checkDuplicateContent(msg, theseItems);
          const count = Math.min(MAX_POOL_ENTRY_LIFETIME, +trigger.split('/')[0]);
          const dur = Math.floor((+trigger.split('/')[1]) * 1000);
          const after = msgTs - dur;
          let individuals = [];
          const needed = Math.max(2, Math.floor(count / 3));
          duplicateMessages = duplicateMessages.filter((item) => {
            if (!individuals.includes(item.authorId)) {
              individuals.push(item.authorId);
            }
            return item.ts > after;
          });
          individuals = [...new Set(individuals)];
          if (repeatedMessages.length >= count && (!thisCfg._key.includes('antiRaid_') || individuals.length >= needed)) {
            flagged.push('duplicateMessages');
          }
        }
      }
    } */
    if (flagged.length > 0) {
      flaggedOnce = true;
      const cleanDuration = typeof thisCfg.cleanDuration === 'number' && thisCfg.cleanDuration > 0 ? Math.min(MAX_POOL_ENTRY_LIFETIME, thisCfg.cleanDuration) : undefined;
      if (typeof thisCfg.action === 'string' && (VALID_ACTIONS_INDIVIDUAL.includes(thisCfg.action.toUpperCase()) || (thisCfg._key.includes('antiRaid_') && VALID_ACTIONS_GLOBAL.includes(thisCfg.action)))) {
        const action = thisCfg.action.toUpperCase();
        const actionDuration = typeof thisCfg.actionDuration === 'string' ? thisCfg.actionDuration : undefined;
        if ((action === 'TEMPMUTE' || action === 'TEMPBAN') && actionDuration === undefined) {
          throw new ConfigError(`config.modules.AntiSpam.${thisCfg._key}.actionDuration`, 'actionDuration malformed');
        }
        let noRun = false;
        let logAct = false;
        if (action === 'LOCK_GUILD') {
          const res = await admin.LockGuild(null, true, utils.timeArgumentToMs(actionDuration), i18n.modules.antispam.action_reason);
          if (res === true) {
            logAct = true;
          }
          noRun = true;
        }
        if (logAct === true) {
          if (VALID_ACTIONS_GLOBAL.includes(action)) {
            logCustom('ANTISPAM', 'ANTIRAID', new Map([['ACTION', action], ['FLAGS', flagged.join(', ')]]));
            if (typeof config.modules.antiSpam.antiRaidPingRole === 'string' && config.modules.antiSpam.antiRaidPingRole.length > 6 && typeof config.modules.antiSpam.antiRaidPingChannel === 'string' && config.modules.antiSpam.antiRaidPingChannel.length > 6) {
              const roleId = config.modules.antiSpam.antiRaidPingRole;
              const channelID = config.modules.antiSpam.antiRaidPingChannel;
              const rolePing = await guild.getRole(roleId);
              const channelPing = await guild.getChannel(channelID);
              if (rolePing instanceof discord.Role && (channelPing instanceof discord.GuildTextChannel || channelPing instanceof discord.GuildNewsChannel)) {
                await channelPing.sendMessage({ content: setPlaceholders(i18n.modules.antispam.raid_channel_msg, ['role_mention', rolePing.toMention(), 'action', action]), allowedMentions: { roles: [rolePing.id] } });
              }
            }
          }
        }
        if (!noRun) {
          switch (action) {
            case 'KICK':
              await infractions.Kick(member, null, i18n.modules.antispam.action_reason);
              break;
            case 'SOFTBAN':
              await infractions.SoftBan(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, i18n.modules.antispam.action_reason);
              break;
            case 'MUTE':
              await infractions.Mute(member, null, i18n.modules.antispam.action_reason);
              break;
            case 'BAN':
              await infractions.Ban(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, i18n.modules.antispam.action_reason);
              break;
            case 'TEMPMUTE':
              await infractions.TempMute(member, null, actionDuration, i18n.modules.antispam.action_reason);
              break;
            case 'TEMPBAN': {
              await infractions.TempBan(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, actionDuration, i18n.modules.antispam.action_reason);
              break;
            }
            default:
              break;
          }
        }
      }
      if (thisCfg.clean === true) {
        let messagesToClear = theseItems.filter((item) => {
          if (item.deleted === true) {
            return false;
          }
          for (const int in flagged) {
            const key = flagged[int];
            if (typeof item[key] === 'number' && item[key] > 0) {
              let dur = cleanDuration !== undefined ? cleanDuration : undefined;
              if (dur !== undefined) {
                return item.ts >= (msgTs - (Math.floor(dur * 1000)));
              }
              const trigger = thisCfg[key];
              if (typeof trigger !== 'string') {
                continue;
              }
              dur = Math.floor((+trigger.split('/')[1]) * 1000);
              return item.ts > (msgTs - dur);
            } if (key === 'duplicateMessages') {
              return duplicateMessages.find((e) => e.id === item.id) !== undefined;
            } if (key === 'messages') {
              return repeatedMessages.find((e) => e.id === item.id) !== undefined;
            }
          }
          return false;
        });
        const makeDeleted = await pools.editTransactMultiWithResult<MessageEntry>(messagesToClear.map((v) => v.id), (prev) => {
          if (prev.deleted === true) {
            return { next: prev, result: false };
          }
          prev.deleted = true;
          return { next: prev, result: true };
        });
        messagesToClear = messagesToClear.filter((v) => {
          if (makeDeleted.has(v.id)) {
            return makeDeleted.get(v.id);
          }
          return true;
        });
        if (messagesToClear.length > 0) {
          messageRemovedCount = messagesToClear.length;
          // todo: check antiping if this is a flag for mentions and add those messages here as well

          const channelMapping: {[key: string]: Array<string>} = {};
          messagesToClear.forEach((e) => {
            if (!Array.isArray(channelMapping[e.channelId])) {
              channelMapping[e.channelId] = [];
            }
            channelMapping[e.channelId].push(e.id);
          });
          if (flagged.includes('mentions')) {
            // push our antiping stuff
            const pingkv = antiping.kv;
            const data:any = await pingkv.get(antiping.kvDataKey);
            if (typeof data === 'object') {
              const antiPingMessages = [];
              for (const userId in data) {
                if (thisCfg._key !== 'antiRaid' && userId !== msg.author.id) {
                  continue;
                }
                for (const mId in data[userId]) {
                  const obj = data[userId][mId];
                  if (typeof (obj) === 'object') {
                    const BotReply = data[userId][mId].BotReplyMsg;
                    const Original = data[userId][mId].OriginalMsg;
                    const isValid = messagesToClear.find((e) => e.id === Original.id);
                    if (!isValid) {
                      continue;
                    }
                    antiPingMessages.push(mId);
                    if (!Array.isArray(channelMapping[BotReply.channelId])) {
                      channelMapping[BotReply.channelId] = [];
                    }
                    if (!channelMapping[BotReply.channelId].includes(BotReply.id)) {
                      channelMapping[BotReply.channelId].push(BotReply.id);
                    }
                  }
                }
              }
              if (antiPingMessages.length > 0) {
                // we dont really care if this fails because the periodic clear will clear it eventually regardless
                try {
                  await pingkv.transact(antiping.kvDataKey, (prev) => {
                    const data2 = JSON.parse(JSON.stringify(prev));
                    for (const userId in data2) {
                      if (thisCfg._key !== 'antiRaid' && userId !== msg.author.id) {
                        continue;
                      }
                      for (const mId in data2[userId]) {
                        if (!antiPingMessages.includes(mId)) {
                          continue;
                        }
                        delete data2[userId][mId];
                      }
                      if (Object.keys(data2[userId]).length === 0) {
                        delete data2[userId];
                      }
                    }
                    return data2;
                  });
                } catch (e) {}
              }
            }
          }
          const me = await guild.getMember(discord.getBotId());
          if (me !== null) {
            const promises = [];
            for (const channelId in channelMapping) {
              promises.push(new Promise(async (resolve?, reject?): Promise<void> => {
                const thisChan = await discord.getChannel(channelId);
                if (thisChan.type !== discord.Channel.Type.GUILD_TEXT && thisChan.type !== discord.Channel.Type.GUILD_NEWS) {
                  resolve(null);
                  return;
                }
                if (!thisChan.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
                  resolve(null);
                  return;
                }
                const mIds = channelMapping[channelId];
                if (mIds.length >= 2) {
                  if (mIds.length > 100) {
                    const splits = utils.chunkArrayInGroups(mIds, 99);
                    await Promise.all(splits.map(async (newmids) => {
                      await thisChan.bulkDeleteMessages(newmids);
                    }));
                  } else {
                    await thisChan.bulkDeleteMessages(mIds);
                  }
                } else {
                  try {
                    const mid = mIds[0];
                    let theMsg: any = msg;
                    if (mid !== msg.id) {
                      theMsg = await thisChan.getMessage(mIds[0]);
                    }
                    if (theMsg !== null) {
                      await theMsg.delete();
                    }
                  } catch (e) {}
                }
                resolve(null);
              }));
            }
            await Promise.all(promises);
          }
        }
      }
    }
    if (flaggedOnce) {
      break;
    }
    if (typeof thisCfg.stop === 'boolean' && thisCfg.stop === true) {
      break;
    }
  }

  if (flaggedOnce) {
    if (!flaggedAntiraid) {
      // if (messageRemovedCount > 0) {
      logCustom('ANTISPAM', 'VIOLATION', new Map([['USERTAG', getUserTag(msg.author)], ['USER_ID', msg.author.id], ['FLAGS', flagged.join(', ')], ['DELETED_MESSAGES', messageRemovedCount.toString()]]));
      // }
    } else {
      logCustom('ANTISPAM', 'ANTIRAID_VIOLATION', new Map([['FLAGS', flagged.join(', ')], ['DELETED_MESSAGES', messageRemovedCount.toString()]]));
    }
  }

  return !flaggedOnce;
}

export async function OnMessageCreate(
  id: string,
  gid: string,
  message: discord.Message,
) {
  if (!(message instanceof discord.GuildMemberMessage) || message.author.bot === true || message.webhookId !== null || typeof message.webhookId === 'string' || message.flags !== 0 || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT) {
    return;
  }
  if (utils.isGlobalAdmin(message.author.id) && guildId !== '307927177154789386') {
    return;
  }
  await pools.saveToPool(new MessageEntry(message));
  const ret = await doChecks(message);
  return ret;
}
export async function OnMessageUpdate(
  id: string,
  gid: string,
  message: discord.Message.AnyMessage,
  oldMessage: discord.Message.AnyMessage,
) {
  if (!(message instanceof discord.GuildMemberMessage) || message.author.bot === true || message.webhookId !== null || message.flags !== 0 || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT || oldMessage === null || message.content === oldMessage.content) {
    return;
  }
  if (utils.isGlobalAdmin(message.author.id) && guildId !== '307927177154789386') {
    return;
  }
  const lf = Date.now() - utils.decomposeSnowflake(message.id).timestamp;
  if (lf > MAX_POOL_ENTRY_LIFETIME) {
    return;
  }
  await pools.editPool(message.id, new MessageEntry(message));
  const ret = await doChecks(message);
  return ret;
}
export async function OnMessageDelete(
  id: string,
  gid: string,
  messageDelete: discord.Event.IMessageDelete,
) {
  // pools.editPool(messageDelete.id, null);
  pools.editTransact<MessageEntry>(messageDelete.id, (prev) => {
    prev.deleted = true;
    return prev;
  });
}

export async function OnMessageDeleteBulk(
  id: string,
  gid: string,
  messages: discord.Event.IMessageDeleteBulk,
) {
  pools.editPools<MessageEntry>(messages.ids, (val) => {
    if (!val) {
      return val;
    }
    if (messages.ids.includes(val.id) && !val.deleted) {
      val.deleted = true;
    }
    return val;
  });
}
