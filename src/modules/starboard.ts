/* eslint-disable no-nested-ternary */
import * as utils from '../lib/utils';
import { config, globalConfig, guildId, Ranks } from '../config';
import * as c2 from '../lib/commands2';
import {StoragePool} from '../lib/storagePools'

const MAX_LIFETIME = 336;
const prefixKvMessages = 'Starboard_messages_';
const prefixKvMessagesStats = 'Starboard_stats_';
const seperator = '|';
const processing = [];
const allowedFileExtensions = ['png', 'jpg', 'jpeg'];
const kv = new pylon.KVNamespace('starboard');

export const statsKv = new StoragePool('starboardStats', 0, 'id');
export class StarStats {
  id: string;
  given = 0;
  received = 0;
  async update() {
    await statsKv.editPool(this.id, this);
  }
  constructor(id: string) {
    this.id = id;
    return this;
  }
}

export class PublishData {
    channelId: string;
    messageId: string;
    lastUpdate: number;
}
export class StarredMessage {
    id: string;
    channelId: string;
    author: string;
    publishData: PublishData;
    reactors: Array<string> = [];
    emojiMention: string;
    constructor(author: string, channelId: string, messageId: string, board: string | false, reactors: Array<string>, emojiMention: string) {
      this.id = messageId;
      this.author = author;
      this.channelId = channelId;
      this.reactors = reactors;
      this.publishData = new PublishData();
      this.emojiMention = emojiMention;
      if (board !== false) {
        this.publishData.channelId = board;
      }
      return this;
    }
    private getReactorCount() {
      return this.reactors.length;
    }
    private async publish() {
      const boardCfg = getBoardCfg(this.publishData.channelId);
      const channel = await discord.getChannel(this.publishData.channelId);
      const ogChannel = await discord.getChannel(this.channelId);
      if ((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS) || (ogChannel.type !== discord.Channel.Type.GUILD_TEXT && ogChannel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      try {
        const ogMsg = await ogChannel.getMessage(this.id);
        const newEmbed = new discord.Embed();
        newEmbed.setAuthor({ iconUrl: ogMsg.author.getAvatarUrl(), name: ogMsg.author.getTag() });
        newEmbed.setTimestamp(new Date().toISOString());
        newEmbed.setFooter({ text: `User: ${ogMsg.author.id} | Message: ${ogMsg.id}` });
        const attachs: Array<string> = [];
        const rejectedattach: Array<string> = [];
        if (ogMsg.attachments.length > 0) {
          ogMsg.attachments.forEach((e) => {
            if (e.filename.includes('.')) {
              const ext = e.filename.split('.');
              const extension = ext[ext.length - 1];
              if (allowedFileExtensions.includes(extension) && attachs.length === 0) {
                attachs.push(e.url);
              } else {
                rejectedattach.push(e.url);
              }
            }
          });
        }
        if (typeof boardCfg.maxReacts === 'number') {
          newEmbed.setColor(getColor(boardCfg.maxReacts, this.getReactorCount()));
        }
        if (attachs.length === 1) {
          newEmbed.setImage({ url: attachs[0] });
        }
        newEmbed.setFields([{ inline: true, name: '​​​', value: `→ [Jump to message](https://discord.com/channels/${guildId}/${ogMsg.channelId}/${ogMsg.id})` }]);
        if (ogMsg.content.length > 0) {
          let cont = ogMsg.content;
          if (cont.length > 1605) {
            cont = `${cont.substr(0, 1600)} ...`;
          }
          if (rejectedattach.length > 0) {
            cont = `${cont}\n${rejectedattach.join('\n')}`;
          }
          newEmbed.setDescription(cont);
        }

        const newmsg = await channel.sendMessage({ embed: newEmbed, allowedMentions: {}, content: `${this.emojiMention} ${this.getReactorCount()} - <#${ogMsg.channelId}>` });
        this.publishData.messageId = newmsg.id;
        this.publishData.lastUpdate = Date.now();
      } catch (e) {}
    }
    private async unpublish() {
      const channel = await discord.getChannel(this.publishData.channelId);
      if ((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      try {
        const oldMsg = await channel.getMessage(this.publishData.messageId);
        await oldMsg.delete();
      } catch (e) {}
      delete this.publishData.messageId;
      delete this.publishData.lastUpdate;
    }
    private async awardStats() {
      const stats = await statsKv.getAll<StarStats>(StarStats);
      const uniqueReactors = this.reactors.filter((e) => e !== this.author).length;
      if (uniqueReactors === 0) {
        return;
      }
      let authorStats: StarStats | undefined = stats.find((e) => e.id === this.author);
      if (!authorStats) {
        authorStats = new StarStats(this.author);
      }
      authorStats = utils.makeFake(authorStats, StarStats);
      authorStats.received+=uniqueReactors;
      await authorStats.update();
       let nf = this.reactors.filter((reactor) => {
         const _e = stats.find((st) => st.id === reactor);
         return _e === undefined && reactor !== this.author;
       });
       console.log('not found:', nf);
       await Promise.all(nf.map(async function(e) {
         const obj = new StarStats(e);
         obj.given+=1;
        await statsKv.saveToPool(obj);
       }));
       if(nf.length !== this.reactors.length) {
         let f = this.reactors.filter((e) => !nf.includes(e) && e !== this.author);
         console.log('found:', f);
         await statsKv.editPools(f, function(vl: StarStats) {
           vl.given+=1;
           return vl;
         })
       }
       /*
      for(var i = 0; i < this.reactors.length; i++) {
        //if(this.reactors[i] === this.author) continue;
        let _f = stats.find((e) => e.id === this.reactors[i]);
        if(!_f) _f = utils.makeFake({id: this.reactors[i], given:0, received: 0}, StarStats);
        _f.given+=1;
        await utils.KVManager.set(_f.getKey(), 0);
      } */
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
    private async update(finalize = false) {
      const boardCfg = getBoardCfg(this.publishData.channelId);
      try {
        const channel = await discord.getChannel(this.publishData.channelId);
        if ((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
          return;
        }

        const oldMsg = await channel.getMessage(this.publishData.messageId);

        const emb = oldMsg.embeds[0];
        if (typeof boardCfg.maxReacts === 'number') {
          emb.setColor(getColor(boardCfg.maxReacts, this.getReactorCount()));
        }
        if (finalize === true && !emb.footer.text.toLowerCase().includes('message deleted')) {
          emb.setFooter({ text: `Message Deleted | ${emb.footer.text}` });
        }
        const emjUse = typeof boardCfg.maxEmoji === 'string' && typeof boardCfg.maxReacts === 'number' && this.getReactorCount() >= boardCfg.maxReacts ? boardCfg.maxEmoji : this.emojiMention;
        /* if (emjUse === boardCfg.maxReacts && emjUse.length > 2 && emjUse.length < 7) {
          emjUse = utils.convertEmoji(boardCfg.maxEmoji);
        } */
        if (typeof boardCfg.minReactsPin === 'number') {
          if (oldMsg.pinned === true && this.getReactorCount() < boardCfg.minReactsPin) {
            await oldMsg.setPinned(false);
          } else if (oldMsg.pinned === false && this.getReactorCount() >= boardCfg.minReactsPin) {
            await oldMsg.setPinned(true);
          }
        }
        await oldMsg.edit({ embed: emb, content: `${emjUse} ${this.getReactorCount()} - <#${this.channelId}>` });
        this.publishData.lastUpdate = Date.now();
      } catch (e) {}
    }
    async deleted() {
      await this.awardStats();
      if (this.publishData.messageId) {
        const boardCfg = getBoardCfg(this.publishData.channelId);
        if (typeof boardCfg.clearOnDelete === 'boolean' && boardCfg.clearOnDelete === true) {
          await this.unpublish();
        } else {
          await this.update(true);
        }
      }
    }
    async finalize() {
      await this.awardStats();
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
        if (diff >= 2000) {
          const upd = await this.needsUpdate();
          if (upd === true) {
            // update the board msg contents
            const chang = await this.update();
            return chang;
          }
        } else {
          setTimeout(async function () {
            await checkKey(`${prefixKvMessages}${this.publishData.channelId}_${this.id}`);
          }, 100 + Math.min(200, (2000 - diff)));
        }
      }
      return false;
    }
    getKey() {
      return `${prefixKvMessages}${this.publishData.channelId}${seperator}${this.id}`;
    }
}


async function checkKey(key: string) {
  let val: any = await utils.KVManager.get(key);
  if (val) {
    val = utils.makeFake(val, StarredMessage);
    await val.check();
  }
}
function getColor(max: number, count: number) {
  const ratio = Math.min(count / max, 1);
  return ((255 << 16) + (Math.floor((194 * ratio) + (253 * (1 - ratio))) << 8) + Math.floor((12 * ratio) + (247 * (1 - ratio))));
}
function getRespectiveBoard(source: string, emoji: any) {
  if (typeof (config.modules.starboard.channels) === 'object') {
    for (const key in config.modules.starboard.channels) {
      const val = config.modules.starboard.channels[key];
      if (typeof emoji !== 'undefined') {
        if (utils.isNumber(val.emoji)) {
          if (typeof emoji.id === 'string' && val.emoji !== emoji.id) {
            continue;
          }
        } else if (typeof emoji.name === 'string' && val.emoji !== emoji.name) {
          continue;
        }
      }
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
  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }
  const keys = (await utils.KVManager.listKeys()).filter((e) => e.substr(0, prefixKvMessages.length) === prefixKvMessages);
  await Promise.all(keys.map(async (e) => {
    const boardId = e.substr(prefixKvMessages.length).split(seperator)[0];
    const cfg = getBoardCfg(boardId);
    const lifetime = typeof cfg.messageLifetime === 'number' ? Math.min(MAX_LIFETIME, cfg.messageLifetime) : MAX_LIFETIME;
    if (typeof cfg === 'object') {
      const messageId = e.substr(prefixKvMessages.length).split(seperator)[1];
      const ts = utils.decomposeSnowflake(messageId).timestamp;
      const diff = Date.now() - ts;
      if (diff > 1000 * 60 * 60) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours >= lifetime) {
          let msgData: any = await utils.KVManager.get(e);
          if (msgData) {
            await utils.KVManager.delete(e);
            msgData = utils.makeFake(msgData, StarredMessage);
            await msgData.finalize();
          }
        }
      }
    }
  }));
}
export async function getStats(userId: string | undefined = undefined): Promise<Array<StarStats>> {
  let keys: Array<StarStats> = (await utils.KVManager.listKeys()).filter((e) => e.substr(0, prefixKvMessagesStats.length) === prefixKvMessagesStats).map((e) => {
    const vals = e.substr(prefixKvMessagesStats.length).split(seperator);
    const [id, given, received] = vals;
    return utils.makeFake({ id, given: +given, received: +received }, StarStats);
  });
  if (typeof userId === 'string') {
    keys = keys.filter((e) => e.id === userId);
  }
  return keys;
}
export async function clearStats() {
  const keys = (await utils.KVManager.listKeys()).filter((e) => e.substr(0, prefixKvMessagesStats.length) === prefixKvMessagesStats);
  await Promise.all(keys.map(async (e) => {
    await utils.KVManager.delete(e);
  }));
}
export async function clearData() {
  const keys = (await utils.KVManager.listKeys()).filter((e) => e.substr(0, prefixKvMessages.length) === prefixKvMessages);
  await Promise.all(keys.map(async (e) => {
    await utils.KVManager.delete(e);
  }));
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
  const blocks = await kv.get('blocks');
  if (!Array.isArray(blocks)) {
    return false;
  }
  return blocks.includes(userId);
}

export async function OnMessageCreate(
  id: string,
  gid: string,
  message: discord.Message,
) {
  if (message.type !== discord.Message.Type.CHANNEL_PINNED_MESSAGE) {
    return;
  }
  if (!Object.keys(config.modules.starboard.channels).includes(message.channelId)) {
    return;
  }
  if (message.author.id === discord.getBotId()) {
    await message.delete();
    return false;
  }
}
export async function OnMessageDelete(
  id: string,
  gid: string,
  messageDelete: discord.Event.IMessageDelete,
) {
  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }
  const keys = (await utils.KVManager.listKeys()).find((e) => e.substr(0, prefixKvMessages.length) === prefixKvMessages && e.substr(prefixKvMessages.length).split(seperator)[1] === messageDelete.id);
  if (keys) {
    let msgData: any = await utils.KVManager.get(keys);
    if (msgData) {
      await utils.KVManager.delete(keys);
      msgData = utils.makeFake(msgData, StarredMessage);
      await msgData.deleted();
    }
  }
}
export async function OnMessageDeleteBulk(
  id: string,
  gid: string,
  messages: discord.Event.IMessageDeleteBulk,
) {
  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }
  const keys = (await utils.KVManager.listKeys()).filter((e) => e.substr(0, prefixKvMessages.length) === prefixKvMessages && messages.ids.includes(e.substr(prefixKvMessages.length).split(seperator)[1]));
  if (keys.length > 0) {
    await Promise.all(keys.map(async (key) => {
      let msgData: any = await utils.KVManager.get(key);
      if (msgData) {
        await utils.KVManager.delete(key);
        msgData = utils.makeFake(msgData, StarredMessage);
        await msgData.deleted();
      }
    }));
  }
}
export async function OnMessageReactionAdd(
  id: string,
  gid: string,
  reaction: discord.Event.IMessageReactionAdd,
) {
  if (!(reaction.member instanceof discord.GuildMember)) {
    return;
  }
  const { emoji } = reaction;
  let isBoardMsg = false;
  let msgId = reaction.messageId;
  if (Object.keys(config.modules.starboard.channels).includes(reaction.channelId)) {
    isBoardMsg = true;
  }
  let board;
  if (!isBoardMsg) {
    board = getRespectiveBoard(reaction.channelId, emoji);
  }
  if (!isBoardMsg && board === false) {
    return;
  }
  let boardCfg;
  if (!isBoardMsg) {
    boardCfg = getBoardCfg(board);
  }
  if (!isBoardMsg && boardCfg === false) {
    return;
  }
  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }
  let chanId = reaction.channelId;
  const channel = await discord.getChannel(reaction.channelId);
  if (channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
    return;
  }
  const message = await channel.getMessage(msgId);
  let actualMsg;
  if (isBoardMsg) {
    board = reaction.channelId;
    boardCfg = config.modules.starboard.channels[reaction.channelId];
    if (message.embeds.length === 1 && message.embeds[0].footer.text.length > 0) {
      const foot = message.embeds[0].footer.text;
      if (!foot.toLowerCase().includes('message deleted') && foot.toLowerCase().includes('user:') && foot.toLowerCase().includes('message:')) {
        const messageid = foot.toLowerCase().split(' ').join('').split('|')[1].split('message:')[1];
        msgId = messageid;
        const chanid = message.content.split('-')[1].split(' ').join('').substring(2).split('>')
          .join('');
        chanId = chanid;
        const chan = await discord.getChannel(chanid);
        if (chan === null || (chan.type !== discord.Channel.Type.GUILD_TEXT && chan.type !== discord.Channel.Type.GUILD_NEWS)) {
          return;
        }
        try {
          actualMsg = await chan.getMessage(messageid);
        } catch (e) {
          return;
        }
        if (actualMsg === null) {
          return;
        }
      }
    }
  } else {
    actualMsg = message;
  }
  if (typeof actualMsg === 'undefined') {
    return;
  }
  if (actualMsg.type !== discord.Message.Type.DEFAULT || (actualMsg.content.length < 1 && actualMsg.attachments.length === 0)) {
    return;
  }

  if (utils.isNumber(boardCfg.emoji)) {
    if (emoji.id !== boardCfg.emoji) {
      return;
    }
  } else if (emoji.name !== boardCfg.emoji) {
    return;
  }
  const lifetime = typeof boardCfg.messageLifetime === 'number' ? Math.min(MAX_LIFETIME, boardCfg.messageLifetime) : MAX_LIFETIME;
  if (typeof boardCfg.messageLifetime === 'number') {
    const diff = Date.now() - utils.decomposeSnowflake(msgId).timestamp;
    if (diff > 1000 * 60 * 60) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours >= lifetime) {
        return;
      }
    }
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
    const isblock2 = await isBlocked(reaction.userId);
    if (isblock2 === true) {
      if (channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) {
        await message.deleteReaction(`${emoji.type === discord.Emoji.Type.UNICODE ? emoji.name : `${emoji.name}:${emoji.id}`}`, reaction.member.user);
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
  const checkStorage: any = (await utils.KVManager.get(`${prefixKvMessages}${board}${seperator}${msgId}`));
  if (checkStorage !== undefined) {
    data = utils.makeFake(checkStorage, StarredMessage);
  } else {
    data = new StarredMessage(actualMsg.author.id, chanId, msgId, board, [], emoji.toMention());
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
    await utils.KVManager.set(data.getKey(), data);
  }
  if (processing.includes(msgId)) {
    processing.splice(processing.indexOf(msgId), 1);
  }
}

export async function OnMessageReactionRemove(id: string, gid: string, reaction: discord.Event.IMessageReactionRemove) {
  if (!(reaction.member instanceof discord.GuildMember)) {
    return;
  }
  const { emoji } = reaction;
  let isBoardMsg = false;
  let msgId = reaction.messageId;
  if (Object.keys(config.modules.starboard.channels).includes(reaction.channelId)) {
    isBoardMsg = true;
  }
  let board;
  if (!isBoardMsg) {
    board = getRespectiveBoard(reaction.channelId, emoji);
  }
  if (!isBoardMsg && board === false) {
    return;
  }
  let boardCfg;
  if (!isBoardMsg) {
    boardCfg = getBoardCfg(board);
  }
  if (!isBoardMsg && boardCfg === false) {
    return;
  }
  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }
  let chanId = reaction.channelId;
  const channel = await discord.getChannel(reaction.channelId);
  if (channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
    return;
  }
  let message;
  try {
    message = await channel.getMessage(msgId);
  } catch (e) {
    return;
  }

  let actualMsg;
  if (isBoardMsg) {
    board = reaction.channelId;
    boardCfg = config.modules.starboard.channels[reaction.channelId];
    if (message.embeds.length === 1 && message.embeds[0].footer.text.length > 0) {
      const foot = message.embeds[0].footer.text;
      if (!foot.toLowerCase().includes('message deleted') && foot.toLowerCase().includes('user:') && foot.toLowerCase().includes('message:')) {
        const messageid = foot.toLowerCase().split(' ').join('').split('|')[1].split('message:')[1];
        msgId = messageid;
        const chanid = message.content.split('-')[1].split(' ').join('').substring(2).split('>')
          .join('');
        chanId = chanid;
        const chan = await discord.getChannel(chanid);
        if (chan === null || (chan.type !== discord.Channel.Type.GUILD_TEXT && chan.type !== discord.Channel.Type.GUILD_NEWS)) {
          return;
        }
        try {
          actualMsg = await chan.getMessage(messageid);
        } catch (e) {
          return;
        } if (actualMsg === null) {
          return;
        }
      }
    }
  } else {
    actualMsg = message;
  }
  if (typeof actualMsg === 'undefined') {
    return;
  }
  if (actualMsg.type !== discord.Message.Type.DEFAULT || (actualMsg.content.length < 1 && actualMsg.attachments.length === 0)) {
    return;
  }
  if (utils.isNumber(boardCfg.emoji)) {
    if (emoji.id !== boardCfg.emoji) {
      return;
    }
  } else if (emoji.name !== boardCfg.emoji) {
    return;
  }
  const lifetime = typeof boardCfg.messageLifetime === 'number' ? Math.min(MAX_LIFETIME, boardCfg.messageLifetime) : MAX_LIFETIME;
  const diff = Date.now() - utils.decomposeSnowflake(msgId).timestamp;
  if (diff > 1000 * 60 * 60) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours >= lifetime) {
      return;
    }
  }

  if (utils.isBlacklisted(reaction.member.user.id) || reaction.member.user.bot === true || (typeof boardCfg.preventSelf === 'boolean' && boardCfg.preventSelf === true && reaction.member.user.id === actualMsg.author.id)) {
    return;
  } if (typeof boardCfg.level === 'number' && boardCfg.level > 0) {
    const canRun = await utils.canMemberRun(boardCfg.level, reaction.member);
    if (!canRun) {
      return;
    }
  } else {
    const isbloc = await isBlocked(actualMsg.author.id);
    if (isbloc === true) {
      return;
    }
    const isblock2 = await isBlocked(reaction.userId);
    if (isblock2 === true) {
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
  const checkStorage: any = (await utils.KVManager.get(`${prefixKvMessages}${board}${seperator}${msgId}`));
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
    await utils.KVManager.set(data.getKey(), data);
  }
  if (processing.includes(msgId)) {
    processing.splice(processing.indexOf(msgId), 1);
  }
}

export async function OnMessageReactionRemoveAll(id: string, gid: string, reaction: discord.Event.IMessageReactionRemoveAll) {
  if (!reaction.guildId) {
    return;
  }

  const board = getRespectiveBoard(reaction.channelId, undefined);
  if (board === false) {
    return;
  }
  const boardCfg = getBoardCfg(board);
  if (boardCfg === false) {
    return;
  }
  const lifetime = typeof boardCfg.messageLifetime === 'number' ? Math.min(MAX_LIFETIME, boardCfg.messageLifetime) : MAX_LIFETIME;
  const diff = Date.now() - utils.decomposeSnowflake(reaction.messageId).timestamp;
  if (diff > 1000 * 60 * 60) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours >= lifetime) {
      return;
    }
  }

  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }

  while (processing.includes(reaction.messageId)) {
    await sleep(200);
  }
  if (!processing.includes(reaction.messageId)) {
    processing.push(reaction.messageId);
  }
  let data: any;
  const checkStorage: any = (await utils.KVManager.get(`${prefixKvMessages}${board}_${reaction.messageId}`));
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
    await utils.KVManager.set(`${prefixKvMessages}${board}_${reaction.messageId}`, data);
  }
  if (processing.includes(reaction.messageId)) {
    processing.splice(processing.indexOf(reaction.messageId), 1);
  }
}
export function InitializeCommands() {
  const _groupOptions = {
    description: 'Starboard Commands',
    filters: c2.getFilters('starboard', Ranks.Moderator),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );

  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  cmdGroup.subcommand('stars', (subCommandGroup) => {
    subCommandGroup.on(
      { name: 'block', filters: c2.getFilters('starboard.stars.block', Ranks.Moderator) },
      (ctx) => ({ user: ctx.user() }),
      async (msg, { user }) => {
        const isb = await isBlocked(user.id);
        if (isb === true) {
          await msg.reply(`${msg.author.toMention()}, ${user.getTag()} is already blocked from the starboard!`);
          return;
        }
        let blocks = await kv.get('blocks');
        if (!Array.isArray(blocks)) {
          blocks = [];
        }
        blocks.push(user.id);
        await kv.put('blocks', blocks);
        await msg.reply(`${msg.author.toMention()}, added ${user.getTag()} to the starboard blocklist`);
      },
    );
    subCommandGroup.on(
      { name: 'unblock', filters: c2.getFilters('starboard.stars.unblock', Ranks.Moderator) },
      (ctx) => ({ user: ctx.user() }),
      async (msg, { user }) => {
        const isb = await isBlocked(user.id);
        if (isb === false) {
          await msg.reply(`${msg.author.toMention()}, ${user.getTag()} is not blocked from the starboard!`);
          return;
        }
        let blocks = await kv.get('blocks');
        if (!Array.isArray(blocks)) {
          blocks = [];
        }
        blocks.splice(blocks.indexOf(user.id), 1);
        await kv.put('blocks', blocks);
        await msg.reply(`${msg.author.toMention()}, removed ${user.getTag()} from the starboard blocklist`);
      },
    );
    subCommandGroup.raw(
      { name: 'lock', filters: c2.getFilters('starboard.stars.lock', Ranks.Administrator) },
      async (msg) => {
        const lock: any = await kv.get('lock');
        if (lock === true) {
          await msg.reply(`${msg.author.toMention()}, the starboard is already locked.`);
          return;
        }
        await kv.put('lock', true);
        await msg.reply(`${msg.author.toMention()}, locked the starboard!`);
      },
    );
    subCommandGroup.raw(
      { name: 'unlock', filters: c2.getFilters('starboard.stars.unlock', Ranks.Administrator) },
      async (msg) => {
        const lock: any = await kv.get('lock');
        if (typeof lock === 'undefined' || (typeof lock === 'boolean' && lock === false)) {
          await msg.reply(`${msg.author.toMention()}, the starboard is not locked.`);
          return;
        }
        await kv.put('lock', false);
        await msg.reply(`${msg.author.toMention()}, unlocked the starboard!`);
      },
    );
  });
  return cmdGroup;
}
