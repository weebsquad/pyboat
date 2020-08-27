import * as utils from '../lib/utils';
import { config, globalConfig, guildId } from '../config';

const prefixKv = 'Starboard_';
const processing = [];
export class PublishData {
    channelId: string;
    messageId: string;
    lastUpdate: number;
}
export class StarredMessage {
    id: string;
    channelId: string;
    publishData: PublishData;
    reactors: Array<string> = [];
    reactorsBoard: Array<string> = [];
    emojiMention: string;
    constructor(channelId: string, messageId: string, reactors: Array<string>, emojiMention: string) {
      this.id = messageId;
      this.channelId = channelId;
      this.reactors = reactors;
      this.publishData = new PublishData();
      this.emojiMention = emojiMention;
      const board = getRespectiveBoard(channelId);
      if (board !== false) {
        this.publishData.channelId = board;
      }
      return this;
    }
    private getReactorCount() {
      return this.reactors.length + this.reactorsBoard.length;
    }
    private async publish() {
      const boardCfg = getBoardCfg(this.publishData.channelId);
      console.log('publish');
      const channel = await discord.getChannel(this.publishData.channelId);
      const ogChannel = await discord.getChannel(this.channelId);
      if ((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS) || (ogChannel.type !== discord.Channel.Type.GUILD_TEXT && ogChannel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      const ogMsg = await ogChannel.getMessage(this.id);
      const newEmbed = new discord.Embed();
      newEmbed.setAuthor({ iconUrl: ogMsg.author.getAvatarUrl(), name: ogMsg.author.getTag() });
      newEmbed.setTimestamp(new Date().toISOString());
      newEmbed.setFooter({ text: `User: ${ogMsg.author.id} | Message: ${ogMsg.id}` });
      if (typeof boardCfg.maxLevel === 'number') {
        newEmbed.setColor(getColor(boardCfg.maxLevel, this.getReactorCount()));
      }
      newEmbed.setFields([{ inline: true, name: '...', value: `→ [Jump to message](https://discord.com/channels/${guildId}/${ogMsg.channelId}/${ogMsg.id})` }]);
      if (ogMsg.content.length > 0) {
        newEmbed.setDescription(ogMsg.content);
      }

      const newmsg = await channel.sendMessage({ embed: newEmbed, allowedMentions: {}, content: `${this.emojiMention} ${this.getReactorCount()} - <#${ogMsg.channelId}>` });
      this.publishData.messageId = newmsg.id;
      this.publishData.lastUpdate = Date.now();
    }
    private async unpublish() {
      console.log('unpublish');
      const channel = await discord.getChannel(this.publishData.channelId);
      if ((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      const oldMsg = await channel.getMessage(this.publishData.messageId);
      await oldMsg.delete();
      delete this.publishData.messageId;
      delete this.publishData.lastUpdate;
    }
    private async needsUpdate() {
      const channel = await discord.getChannel(this.publishData.channelId);
      if ((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      const oldMsg = await channel.getMessage(this.publishData.messageId);
      const split = oldMsg.content.split('-')[0].split(' ').join('').slice(-1);
      if (utils.isNumber(split) && utils.isNormalInteger(split, true)) {
        const _num = +split;
        return _num !== this.getReactorCount();
      }
      return false;
    }
    private async update() {
      const boardCfg = getBoardCfg(this.publishData.channelId);
      console.log('update');
      const channel = await discord.getChannel(this.publishData.channelId);
      if ((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      const oldMsg = await channel.getMessage(this.publishData.messageId);
      const emb = oldMsg.embeds[0];
      if (typeof boardCfg.maxLevel === 'number') {
        emb.setColor(getColor(boardCfg.maxLevel, this.getReactorCount()));
      }
      const emjUse = typeof boardCfg.maxEmoji === 'string' && typeof boardCfg.maxLevel === 'number' && this.getReactorCount() >= boardCfg.maxLevel ? boardCfg.maxEmoji : this.emojiMention;
      await oldMsg.edit({ embed: emb, content: `${emjUse} ${this.getReactorCount()} - <#${this.channelId}>` });
      this.publishData.lastUpdate = Date.now();
    }
    async check() {
      const boardCfg = getBoardCfg(this.publishData.channelId);
      if (this.getReactorCount() >= boardCfg.minReacts) {
        if (!this.publishData.messageId) {
          // publish
          await this.publish();
          return true;
        }
      } else if (this.publishData.messageId) {
        // unpublish
        await this.unpublish();
        return true;
      }
      if (this.publishData.messageId && this.publishData.lastUpdate) {
        const diff = Date.now() - this.publishData.lastUpdate;
        if (diff >= 1000) {
          const upd = await this.needsUpdate();
          if (upd === true) {
            // update the board msg contents
            const chang = await this.update();
            return chang;
          }
        }
      }
      return false;
    }
}
export class UserStats {
    userId: string;
    given: number;
    received: number;
}
function getColor(max: number, count: number) {
  const ratio = Math.min(count / max, 1);
  return ((255 << 16) + (Math.floor((194 * ratio) + (253 * (1 - ratio))) << 8) + Math.floor((12 * ratio) + (247 * (1 - ratio))));
}
function getRespectiveBoard(source: string) {
  if (typeof (config.modules.starboard.channels) === 'object') {
    for (const key in config.modules.starboard.channels) {
      const val = config.modules.starboard.channels[key];
      if (Array.isArray(val.excludes) && val.excludes.includes(source)) {
        continue;
      }
      if (!Array.isArray(val.includes) || val.includes.length === 0) {
        return key;
      }
      if (val.includes.includes(source)) {
        return key;
      }
    }
  }
  return false;
}
export async function periodicClear() {
    const keys = (await utils.KVManager.listKeys()).filter(function(e) {
        return e.substr(0, prefixKv.length) === prefixKv
    });
    await Promise.all(keys.map(async function(e) { 
        const boardId = e.split(prefixKv).join('').split('_')[0];
        const cfg = getBoardCfg(boardId);
        if(typeof cfg === 'object' && typeof cfg.messageLifetime === 'number') {
            const messageId = e.split(prefixKv).join('').split('_')[1];
            const ts = utils.decomposeSnowflake(messageId).timestamp;
            const diff = Date.now() - ts;
            if(diff > 1000*60*60) {
                const hours = Math.floor(diff/(1000*60*60));
                if(hours >= cfg.messageLifetime) {
                    await utils.KVManager.delete(e);
                }
            }
        }
    }));
}
export async function clearData() {
    const keys = (await utils.KVManager.listKeys()).filter(function(e) {
        return e.substr(0, prefixKv.length) === prefixKv
    });
    await Promise.all(keys.map(async function(e) { await utils.KVManager.delete(e)}));
}
function getBoardCfg(channelId: string) {
  if (typeof (config.modules.starboard.channels) === 'object') {
    if (typeof (config.modules.starboard.channels[channelId]) === 'object') {
      return config.modules.starboard.channels[channelId];
    }
  }
  return false;
}
export async function isBlocked(userId: string) {
  return false;
}
/*
export async function OnMessageDelete(
  id: string,
  gid: string,
  messageDelete: discord.Event.IMessageDelete,
  oldMessage: discord.Message,
) {}
export async function OnMessageDeleteBulk(
  id: string,
  gid: string,
  messages: discord.Event.IMessageDeleteBulk,
) {}*/
export async function OnMessageReactionAdd(
  id: string,
  gid: string,
  reaction: discord.Event.IMessageReactionAdd,
) {
  if (!(reaction.member instanceof discord.GuildMember)) {
    return;
  }
  let isBoardMsg = false;
  let msgId = reaction.messageId;
  if(Object.keys(config.modules.starboard.channels).includes(reaction.channelId)) {
      isBoardMsg = true;
  }
  let board;
  if(!isBoardMsg) board = getRespectiveBoard(reaction.channelId);
  if (!isBoardMsg && board === false) {
    return;
  }
  let boardCfg;
  if(!isBoardMsg)  boardCfg = getBoardCfg(board);
  if (!isBoardMsg && boardCfg === false) {
    return;
  }
  let chanId = reaction.channelId;
  const channel = await discord.getChannel(reaction.channelId);
  if (channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
    return;
  }
  const message = await channel.getMessage(msgId);
  let actualMsg;
  if(isBoardMsg) {
      board = reaction.channelId;
      boardCfg = config.modules.starboard.channels[reaction.channelId];
      if(message.embeds.length === 1 && message.embeds[0].footer.text.length > 0) {
        const foot = message.embeds[0].footer.text;
        if(foot.toLowerCase().includes('user:') && foot.toLowerCase().includes('message:')) {
            const messageid = foot.toLowerCase().split(' ').join('').split('|')[1].split('message:')[1];
            msgId = messageid;
            let chanid = message.content.split('-')[1].split(' ').join('').substring(2).split('>').join('');
            chanId = chanid;
            console.log('channel id: ' + chanid);
            const chan = await discord.getChannel(chanid);
            if (chan === null || (chan.type !== discord.Channel.Type.GUILD_TEXT && chan.type !== discord.Channel.Type.GUILD_NEWS)) {
                return;
              }
            actualMsg = await chan.getMessage(messageid);
            console.log('got msg');
        }
    }
  } else {
      actualMsg = message;
  }
  if(typeof boardCfg.messageLifetime === 'number') {
      const diff = Date.now() - utils.decomposeSnowflake(msgId).timestamp;
      if(diff > 1000*60*60) {
        const hours = Math.floor(diff/(1000*60*60));
        if(hours >= boardCfg.messageLifetime) {
            return;
        }
    }
  }

  const { emoji } = reaction;
  if (utils.isNumber(boardCfg.emoji)) {
    if (emoji.id !== boardCfg.emoji) {
      return;
    }
  } else if (emoji.name !== boardCfg.emoji) {
    return;
  }

  
  
  const me = await (await channel.getGuild()).getMember(discord.getBotId());
  if (utils.isBlacklisted(reaction.member.user.id) || reaction.member.user.bot === true || (typeof boardCfg.preventSelf === 'boolean' && boardCfg.preventSelf === true && reaction.member.user.id === actualMsg.author.id)) {
    if (channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
      await message.deleteReaction(`${emoji.type === discord.Emoji.Type.UNICODE ? emoji.name : `${emoji.name}:${emoji.id}`}`, reaction.member.user);
    }
    return;
  } if (typeof boardCfg.level === 'number' && boardCfg.level > 0) {
    const canRun = await utils.canMemberRun(boardCfg.level, reaction.member);
    if (!canRun) {
      if (channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
        await message.deleteReaction(`${emoji.type === discord.Emoji.Type.UNICODE ? emoji.name : `${emoji.name}:${emoji.id}`}`, reaction.member.user);
      }
      return;
    }
  } else {
    const isbloc = await isBlocked(actualMsg.author.id);
    if (isbloc === true) {
      if (channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
        await message.deleteAllReactionsForEmoji(`${emoji.type === discord.Emoji.Type.UNICODE ? emoji.name : `${emoji.name}:${emoji.id}`}`);
      }
      return;
    }
  }
  while (processing.includes(msgId)) {
    await sleep(200);
  }
  if (!processing.includes(msgId)) {
    processing.push(msgId);
  }
  let data: any;
  const checkStorage: any = (await utils.KVManager.get(`${prefixKv}${board}_${msgId}`));
  if (checkStorage !== undefined) {
    data = utils.makeFake(checkStorage, StarredMessage);
  } else {
    data = new StarredMessage(chanId, msgId, [], emoji.toMention());
  }
  let changes = false;
  if (!data.reactors.includes(reaction.userId)) {
    changes = true;
    data.reactors.push(reaction.userId);
  } else {
    if (processing.includes(msgId)) {
      processing.splice(processing.indexOf(msgId), 1);
    }
    return;
  }
  const check = await data.check();
  if (check === true) {
    changes = true;
  }
  if (changes === true) {
    await utils.KVManager.set(`${prefixKv}${board}_${msgId}`, data);
  }
  if (processing.includes(msgId)) {
    processing.splice(processing.indexOf(msgId), 1);
  }
}

export async function OnMessageReactionRemove(id: string, gid: string, reaction: discord.Event.IMessageReactionRemove) {
  if (!(reaction.member instanceof discord.GuildMember)) {
    return;
  }
  const board = getRespectiveBoard(reaction.channelId);
  if (board === false) {
    return;
  }
  const boardCfg = getBoardCfg(board);
  if (boardCfg === false) {
    return;
  }
  if(typeof boardCfg.messageLifetime === 'number') {
    const diff = Date.now() - utils.decomposeSnowflake(reaction.messageId).timestamp;
    if(diff > 1000*60*60) {
      const hours = Math.floor(diff/(1000*60*60));
      if(hours >= boardCfg.messageLifetime) {
          return;
      }
  }
}

  const { emoji } = reaction;
  if (utils.isNumber(boardCfg.emoji)) {
    if (emoji.id !== boardCfg.emoji) {
      return;
    }
  } else if (emoji.name !== boardCfg.emoji) {
    return;
  }

  const channel = await discord.getChannel(reaction.channelId);
  if (channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
    return;
  }
  const message = await channel.getMessage(reaction.messageId);
  if (utils.isBlacklisted(reaction.member.user.id) || reaction.member.user.bot === true || (typeof boardCfg.preventSelf === 'boolean' && boardCfg.preventSelf === true && reaction.member.user.id === message.author.id)) {
    return;
  } if (typeof boardCfg.level === 'number' && boardCfg.level > 0) {
    const canRun = await utils.canMemberRun(boardCfg.level, reaction.member);
    if (!canRun) {
      return;
    }
  } else {
    const isbloc = await isBlocked(message.author.id);
    if (isbloc === true) {
      return;
    }
  }
  while (processing.includes(reaction.messageId)) {
    await sleep(200);
  }
  if (!processing.includes(reaction.messageId)) {
    processing.push(reaction.messageId);
  }
  let data: any;
  const checkStorage: any = (await utils.KVManager.get(`${prefixKv}${board}_${reaction.messageId}`));
  if (checkStorage !== undefined) {
    data = utils.makeFake(checkStorage, StarredMessage);
  } else {
    return;
  }
  let changes = false;
  if (data.reactors.includes(reaction.userId)) {
    changes = true;
    data.reactors.splice(data.reactors.indexOf(reaction.userId), 1);
  } else {
    if (processing.includes(reaction.messageId)) {
      processing.splice(processing.indexOf(reaction.messageId), 1);
    }
    return;
  }
  const check = await data.check();
  if (check === true) {
    changes = true;
  }
  if (changes === true) {
    await utils.KVManager.set(`${prefixKv}${board}_${reaction.messageId}`, data);
  }
  if (processing.includes(reaction.messageId)) {
    processing.splice(processing.indexOf(reaction.messageId), 1);
  }
}

export async function OnMessageReactionRemoveAll(id: string, guildId: string, reaction: discord.Event.IMessageReactionRemoveAll) {
    if(!reaction.guildId) return;
      const board = getRespectiveBoard(reaction.channelId);
      if (board === false) {
        return;
      }
      const boardCfg = getBoardCfg(board);
      if (boardCfg === false) {
        return;
      }
      if(typeof boardCfg.messageLifetime === 'number') {
        const diff = Date.now() - utils.decomposeSnowflake(reaction.messageId).timestamp;
        if(diff > 1000*60*60) {
          const hours = Math.floor(diff/(1000*60*60));
          if(hours >= boardCfg.messageLifetime) {
              return;
          }
      }
    }
    
      while (processing.includes(reaction.messageId)) {
        await sleep(200);
      }
      if (!processing.includes(reaction.messageId)) {
        processing.push(reaction.messageId);
      }
      let data: any;
      const checkStorage: any = (await utils.KVManager.get(`${prefixKv}${board}_${reaction.messageId}`));
      if (checkStorage !== undefined) {
        data = utils.makeFake(checkStorage, StarredMessage);
      } else {
        return;
      }
      let changes = false;
      if (data.reactors.length > 0) {
        changes = true;
        data.reactors = [];
      } else {
        if (processing.includes(reaction.messageId)) {
          processing.splice(processing.indexOf(reaction.messageId), 1);
        }
        return;
      }
      const check = await data.check();
      if (check === true) {
        changes = true;
      }
      if (changes === true) {
        await utils.KVManager.set(`${prefixKv}${board}_${reaction.messageId}`, data);
      }
      if (processing.includes(reaction.messageId)) {
        processing.splice(processing.indexOf(reaction.messageId), 1);
      }
}