import {ConfigError, guildId, config} from '../config'
import * as utils from '../lib/utils';
import * as infractions from './infractions';
import { AsciiRegex } from '../constants/discord';
import * as antiping from './antiPing'

const removeWhenComparing = ['\n', '\r', '\t', ' '];
const poolsKv = new pylon.KVNamespace('antiSpam');

const VALID_ACTIONS_INDIVIDUAL = ['KICK', 'SOFTBAN', 'BAN', 'MUTE', 'TEMPMUTE', 'TEMPBAN'];
const MAX_POOL_ENTRY_LIFETIME = 120 * 1000;
const ACTION_REASON = 'Too many spam violations';
const MAX_POOL_SIZE = 7500;
class MessageEntry {
    authorId: string;
    id: string;
    channelId: string;
    deleted: boolean = false;
    ts: number;
    content: string;
    characters: number | undefined = undefined;
    attachments: number | undefined = undefined;
    attachmentHashes: Array<string> | undefined = undefined;
    newlines: number | undefined = undefined;
    mentions: number | undefined = undefined;
    links: number | undefined = undefined;
    constructor(message: discord.GuildMemberMessage) {
      this.attachments = message.attachments.length > 0 ? message.attachments.length : undefined;
      this.authorId = message.author.id;
      this.channelId = message.channelId;
      this.id = message.id;
      this.ts = utils.decomposeSnowflake(this.id).timestamp;
      this.content = cleanString(message.content);
      this.mentions = message.mentions.length > 0 ? message.mentions.length : undefined;
      if(this.content.includes('\n')) {
          this.newlines = this.content.split('\n').length-1;
      }
      this.characters = this.content.length;
    }
}
export function getApplicableConfigs(member: discord.GuildMember, channel: discord.GuildChannel | undefined = undefined): Array<any> {
    const toret = [];
    const cfgMod = config.modules.antiSpam;
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
            toret.push({ _key: `level_${lvl}`, ...cfgMod.levels[lvl] });
          }
        });
    }
    return toret;
  }

export async function cleanPool() {
    const diff = Date.now();
    const items = await poolsKv.items();
    await Promise.all(items.map(async function(item: any) {
        const vl: Array<MessageEntry> = item.value;
        const key = item.key;
        let toRemove = vl.filter((e) => diff > (MAX_POOL_ENTRY_LIFETIME+e.ts)).map((e) => e.id);
        if(toRemove.length > 0) {
            await poolsKv.transact(key, function(prev: any) {
                return prev.filter((e: MessageEntry) => !
                toRemove.includes(e.id))
            });
        }
    }))
}
export async function editPool(msg: discord.GuildMemberMessage | null, msgId: string | undefined = undefined) {
    let newObj;
    if(msg !== null) {
        newObj = new MessageEntry(msg);
        msgId = msg.id;
    }
  const items = await poolsKv.items();
  const res = items.find((item: any) => item.value.find((e: MessageEntry) => e.id === msgId) !== undefined);
  if(res) {
      for(var i = 0; i <2; i+=1) {
          try {
            await poolsKv.transact(res.key, function(prev: any) {
                const _ind = prev.findIndex((e: MessageEntry) => e.id === msgId);
                if(_ind !== -1 && msg !== null) {
                    prev[_ind] = newObj;
                } else if(_ind !== -1 && msg === null) {
                    prev[_ind].deleted = true;
                }
                return prev;
            });
            return true;
          } catch(e) {
          }
        }
    return false;
  }

  return false;
}
export async function saveToPool(msg: discord.GuildMemberMessage) {
  const newObj = JSON.parse(JSON.stringify(new MessageEntry(msg)));
  const thisLen = new TextEncoder().encode(JSON.stringify(newObj)).byteLength;
  const items = await poolsKv.items();
    let saveTo;
  const res = items.every((item: any) => {
    if (!Array.isArray(item.value)) {
      return true;
    }
    const _entries: Array<MessageEntry> = item.value;
    const len = (new TextEncoder().encode(JSON.stringify(_entries)).byteLength)+thisLen;
    if(len < MAX_POOL_SIZE) {
        saveTo = item.key;
        return false;
    }
    return true;
  });
  if (res === true) {
    await poolsKv.put(utils.composeSnowflake(), [newObj]);
    return true;
  }
  if(res === false && typeof saveTo === 'string') {
      for(var i = 0; i <2; i+=1) {
          try {
            await poolsKv.transact(saveTo, function(prev: any) {
                return prev.concat(newObj);
            });
            return true;
          } catch(e) {
          }
        }
    return false;
  }

  return false;
}
export async function getAllPools(): Promise<Array<MessageEntry>> {
  const items = await poolsKv.items();
  const _ret: Array<MessageEntry> = [];
  items.map((e: any) => {
    if (Array.isArray(e.value)) {
      _ret.push(...e.value);
    }
  });
  return _ret;
}
export async function getMessagesBy(userId: string) {
    const ps = (await getAllPools()).filter((e) => e.authorId === userId);
    return ps;
}

export function cleanString(str: string) {
    let _str = str + '';
    _str = _str.toLowerCase().replace(AsciiRegex, "");
    removeWhenComparing.forEach((e) => { if(_str.includes(e)) {
        _str = _str.split(e).join('')}
    });
    return _str;
}
export function checkDuplicateContent(msg: discord.GuildMemberMessage, items: Array<MessageEntry>): Array<MessageEntry> {
    let toRet = [];
    let cleanContent = cleanString(msg.content);
    toRet = items.filter((item) => {
        if(msg.id === item.id) return false;
        const thisCont = item.content;
        const len = thisCont.length;
        if(len < 4) return thisCont === cleanContent;
        const similarity = (utils.stringSimilarity(cleanContent, thisCont))*100;
        return similarity > 90;
    });
    return toRet;
}
export function exceedsThreshold(items: Array<MessageEntry>, key: string, allowed: number, after: number) {
    let _matches = 0;
    items.every((item) => {
        if(item.ts < after) return true;
        if(typeof item[key] === 'number') _matches += item[key];
        if(_matches >= allowed) return false;
        return true;
    });
    if(_matches > 0) console.log(`Found matches for [${key}] = ${_matches}/${allowed}`);
    return _matches >= allowed;
}
export async function doChecks(msg: discord.GuildMemberMessage) {
    let flaggedOnce = false;
    const msgTs = utils.decomposeSnowflake(msg.id).timestamp;
    const channel = await msg.getChannel();
    const guild = await msg.getGuild();
    const member = msg.member;
    if(channel === null || guild === null) return;
    const previous = await getMessagesBy(msg.author.id);
    const thisObj = previous.find((e) => e.id === msg.id);
    if(!thisObj || previous.length === 0) return;
    let appConfigs = getApplicableConfigs(member, channel);
    if (typeof config.modules.antiSpam === 'object' && typeof config.modules.antiSpam.antiRaid === 'object') {
        appConfigs.push({_key: 'antiRaid', ...config.modules.antiSpam.antiRaid});
    }
    if(appConfigs.length === 0) return;
    const normalKeysCheck = ['newlines', 'attachments', 'emoji', 'mentions', 'links'];
    let flagged = [];
    for(let i = 0; i < appConfigs.length; i+=1) {
        const thisCfg = appConfigs[i];
        let theseItems = previous;
        if(thisCfg._key.includes('channel_') || thisCfg._key.includes('category_')) {
            theseItems = previous.filter((e) => e.channelId === msg.channelId);
        }
        if(thisCfg._key === 'antiRaid') continue;
        flagged = normalKeysCheck.filter((check) => {
            if(typeof thisCfg[check] !== 'string') return false;
            if(typeof thisObj[check] !== 'number' || thisObj[check] < 1) return false;
            const trigger = thisCfg[check];
            if(!trigger.includes('/')) return false;
            if(!utils.isNormalInteger(trigger.split('/')[0]) || !utils.isNormalInteger(trigger.split('/')[1])) return false;
            const count = Math.min(MAX_POOL_ENTRY_LIFETIME, +trigger.split('/')[0]);
            const dur = Math.floor((+trigger.split('/')[1])*1000);
            const after = msgTs-dur;
            return exceedsThreshold(theseItems, check, count, after);
        });
        let duplicateMessages: undefined | Array<MessageEntry>;
        let repeatedMessages: undefined | Array<MessageEntry>;
        if(typeof thisCfg.messages === 'string') {
            const trigger = thisCfg.messages;
            if(trigger.includes('/')) {
                const count = Math.min(MAX_POOL_ENTRY_LIFETIME, +trigger.split('/')[0]);
                const dur = Math.floor((+trigger.split('/')[1])*1000);
                const after = msgTs-dur;
                repeatedMessages = theseItems.filter((item) => item.ts > after && item.id !== msg.id);
                if(repeatedMessages.length >= count) flagged.push('messages');
            }
        }
        if(typeof thisCfg.duplicateMessages === 'string') {
            const trigger = thisCfg.duplicateMessages;
            if(trigger.includes('/')) {
                duplicateMessages = checkDuplicateContent(msg, theseItems)
                const count = Math.min(MAX_POOL_ENTRY_LIFETIME, +trigger.split('/')[0]);
                const dur = Math.floor((+trigger.split('/')[1])*1000);
                const after = msgTs-dur;
                duplicateMessages = duplicateMessages.filter((item) => item.ts > after)
                if(duplicateMessages.length >= count) flagged.push('duplicateMessages');
            }
        }
        if(flagged.length > 0) {
            flaggedOnce = true;
            const cleanDuration = typeof thisCfg.cleanDuration === 'number' ? Math.min(MAX_POOL_ENTRY_LIFETIME, thisCfg.cleanDuration) : undefined;
            console.log('Flagged!', flagged);
            
            if(typeof thisCfg.action === 'string' && VALID_ACTIONS_INDIVIDUAL.includes(thisCfg.action.toUpperCase())) {
                const action = thisCfg.action.toUpperCase();
                const actionDuration = typeof thisCfg.actionDuration === 'string' ? thisCfg.actionDuration : undefined;
                if((action === 'TEMPMUTE' || action === 'TEMPBAN') && actionDuration === undefined) throw new ConfigError('config.modules.antiPing._key_.actionDuration', 'actionDuration malformed');
                switch (action) {
                    case 'KICK':
                      await infractions.Kick(member, null, ACTION_REASON);
                      break;
                    case 'SOFTBAN':
                      await infractions.SoftBan(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, ACTION_REASON);
                      break;
                    case 'MUTE':
                      await infractions.Mute(member, null, ACTION_REASON);
                      break;
                    case 'BAN':
                      await infractions.Ban(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, ACTION_REASON);
                      break;
                    case 'TEMPMUTE':
                      await infractions.TempMute(member, null, actionDuration, ACTION_REASON);
                      break;
                    case 'TEMPBAN':
                      await infractions.TempBan(member, null, typeof config.modules.infractions.defaultDeleteDays === 'number' ? config.modules.infractions.defaultDeleteDays : 0, actionDuration, ACTION_REASON);
                      break;
                    default:
                      break;
                  }
            }
            if(thisCfg.clean === true) {
                const messagesToClear = theseItems.filter((item) => {
                    if(item.deleted === true) return false;
                    for(const int in flagged) {
                        const key = flagged[int];
                        if(typeof item[key] === 'number' && item[key] > 0) {
                            let dur = cleanDuration !== undefined ? cleanDuration : undefined;
                            if(dur !== undefined) {
                                return item.ts > (msgTs-(Math.floor(dur*1000)));
                            } else {
                                const trigger = thisCfg[key];
                                if(typeof trigger !== 'string') continue;
                                dur = Math.floor((+trigger.split('/')[1])*1000);
                                return item.ts > (msgTs-dur);
                            }
                        } else if(key === 'duplicateMessages') {
                            return duplicateMessages.find((e) => e.id === item.id) !== undefined;
                        } else if(key === 'messages') {
                            return repeatedMessages.find((e) => e.id === item.id) !== undefined;
                        }
                    }
                    return false;
                });
                console.log(`msgstoclear : ${messagesToClear.length}`);
                if(messagesToClear.length > 0) {
                    // todo: check antiping if this is a flag for mentions and add those messages here as well
                    
                    let channelMapping: {[key: string]: Array<string>} = {}
                    messagesToClear.forEach((e) => {
                        if(!Array.isArray(channelMapping[e.channelId])) channelMapping[e.channelId] = [];
                        channelMapping[e.channelId].push(e.id);
                    });
                    if(flagged.includes('mentions')) {
                        // push our antiping stuff
                        const pingkv = antiping.kv;
                        const data:any = await pingkv.get(antiping.kvDataKey);
                        if(typeof data === 'object') {
                        let antiPingMessages = [];
                        for (const userId in data) {
                            if(thisCfg._key !== 'antiRaid' && userId !== msg.author.id) continue;
                            for (const mId in data[userId]) {
                                const obj = data[userId][mId];
                                if(typeof(obj) === 'object') {
                                    const BotReply = data[userId][mId].BotReplyMsg;
                                    const Original = data[userId][mId].OriginalMsg;
                                    const isValid = messagesToClear.find((e) => e.id === Original.id);
                                    if(!isValid) continue;
                                    antiPingMessages.push(mId);
                                    if(!Array.isArray(channelMapping[BotReply.channelId])) channelMapping[BotReply.channelId] = [];
                                    if(!channelMapping[BotReply.channelId].includes(BotReply.id)) {
                                        channelMapping[BotReply.channelId].push(BotReply.id);
                                    }
                                }
                            }
                        }
                        if(antiPingMessages.length > 0) {
                            // we dont really care if this fails because the periodic clear will clear it eventually regardless
                            try {
                                await pingkv.transact(antiping.kvDataKey, function(prev) {
                                    let data = JSON.parse(JSON.stringify(prev));
                                    for (const userId in data) {
                                        if(thisCfg._key !== 'antiRaid' && userId !== msg.author.id) continue;
                                        for (const mId in data[userId]) {
                                            if(!antiPingMessages.includes(mId)) continue;
                                            delete data[userId][mId];
                                        }
                                    }
                                    return data;
                                });
                            } catch(e) {}
                        }
                    }

                    }
                    const me = await guild.getMember(discord.getBotId());
                    if(me !== null) {
                        let promises = [];
                        for(const channelId in channelMapping) {
                            promises.push(new Promise(async function(resolve, reject) {
                                const thisChan = await discord.getChannel(channelId);
                                if(thisChan.type !== discord.Channel.Type.GUILD_TEXT && thisChan.type !== discord.Channel.Type.GUILD_NEWS) {
                                    resolve();
                                    return;
                                }
                                if(!thisChan.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
                                    resolve();
                                    return;
                                }
                                const mIds = channelMapping[channelId];
                                if(mIds.length >= 2) {
                                    await thisChan.bulkDeleteMessages(mIds);
                                } else {
                                    try {
                                        const mid = mIds[0];
                                        let theMsg: any = msg;
                                        if(mid !== msg.id) {
                                            theMsg = await thisChan.getMessage(mIds[0]);
                                        }
                                        if(theMsg !== null) {
                                            await theMsg.delete();
                                        }
                                    } catch(e) {}
                                }
                                resolve();
                            }));
                        }
                        await Promise.all(promises);
                    }
                }
            }
        } else {
            if(typeof thisCfg.stop === 'boolean' && thisCfg.stop === true) break;
        }
}  
return !flaggedOnce;
}

export async function OnMessageCreate(
    id: string,
    gid: string,
    message: discord.Message,
  ) {
      if(!(message instanceof discord.GuildMemberMessage) || message.author.bot === true || message.webhookId !== null || typeof message.webhookId === 'string' || message.flags !== 0 || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT) return;
      if(utils.isGlobalAdmin(message.author.id) && guildId !== '307927177154789386') return;
      await saveToPool(message);
      const ret = await doChecks(message);
      return ret;
  }
  export async function OnMessageUpdate(
    id: string,
    gid: string,
    message: discord.Message.AnyMessage,
    oldMessage: discord.Message.AnyMessage,
  ) {
      if(!(message instanceof discord.GuildMemberMessage) || message.author.bot === true || message.webhookId !== null || message.flags !== 0 || !(message.member instanceof discord.GuildMember) || message.type !== discord.Message.Type.DEFAULT || oldMessage === null || message.content === oldMessage.content) return;
      if(utils.isGlobalAdmin(message.author.id) && guildId !== '307927177154789386') return;
      const lf = Date.now() - utils.decomposeSnowflake(message.id).timestamp;
      if(lf > MAX_POOL_ENTRY_LIFETIME) return;
        await editPool(message);
        const ret = await doChecks(message);
        return ret;
    }
    export async function OnMessageDelete(
        id: string,
        gid: string,
        messageDelete: discord.Event.IMessageDelete
      ) {
          await editPool(null, messageDelete.id);
      }

      export async function OnMessageDeleteBulk(
        id: string,
        gid: string,
        messages: discord.Event.IMessageDeleteBulk,
      ) {
          const dt = Date.now();
          if(messages.ids.length > 8) {
              // transact .... ?
              await pylon.requestCpuBurst(async function() {
            await Promise.all(messages.ids.map(async function(msg) {
                await editPool(null, msg);
              }));
            });
          } else {
          await Promise.all(messages.ids.map(async function(msg) {
            await editPool(null, msg);
          }));
        }
          console.log(`Took ${Date.now()-dt}ms to process antiSpam bulkdelete of ${messages.ids.length} messages`);
      }