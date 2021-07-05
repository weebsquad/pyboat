/* eslint-disable no-nested-ternary */
import * as utils from '../lib/utils';
import { config, globalConfig, guildId, Ranks } from '../config';
import * as c2 from '../lib/commands2';
import { StoragePool } from '../lib/storagePools';
import { saveMessage } from './admin';
import { registerSlash, registerSlashGroup, registerSlashSub, interactionChannelRespond, registerChatRaw, registerChatOn, registerChatSubCallback } from './commands';
import { language as i18n, setPlaceholders } from '../localization/interface';

const MAX_LIFETIME = 336;

const processing: string[] = [];
const allowedFileExtensions = ['png', 'jpg', 'jpeg'];
const kv = new pylon.KVNamespace('starboard');

export const messagesKv = new StoragePool({
  name: 'starboardMessages',
  idProperty: 'id',
  local: false,
});

export const statsKv = new StoragePool({
  name: 'starboardStats',
  idProperty: 'id',
  local: false,
});
export class StarStats {
  id: string;
  given = 0;
  received = 0;
  posts = 0;
  async update() {
    await statsKv.editPool(this.id, { id: this.id, given: this.received, received: this.received, posts: this.posts });
  }
  constructor(id: string) {
    this.id = id;
    return this;
  }
}

export class PublishData {
    channelId: string | undefined;
    messageId: string | undefined;
    lastUpdate: number | undefined;
    constructor(ch: string | undefined = undefined, msg :string | undefined = undefined, last: number | undefined = undefined) {
      this.channelId = ch;
      this.messageId = msg;
      this.lastUpdate = last;
      return this;
    }
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
    private async updateStorage() {
      await messagesKv.saveToPool(this);
    }
    private async publish() {
      if (!this.publishData.channelId) {
        return;
      }
      const boardCfg = getBoardCfg(this.publishData.channelId);
      const channel = await discord.getChannel(this.publishData.channelId);
      const ogChannel = await discord.getChannel(this.channelId);
      if (channel === null || ogChannel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS) || (ogChannel.type !== discord.Channel.Type.GUILD_TEXT && ogChannel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      try {
        const ogMsg = await ogChannel.getMessage(this.id);
        if (!ogMsg) {
          return;
        }
        const newEmbed = new discord.Embed();
        newEmbed.setAuthor({ iconUrl: ogMsg.author.getAvatarUrl(), name: ogMsg.author.getTag() });
        newEmbed.setTimestamp(new Date().toISOString());
        newEmbed.setFooter({ text: `${i18n.modules.starboard.s_terms.user}: ${ogMsg.author.id} | ${i18n.modules.starboard.s_terms.message}: ${ogMsg.id}` });
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
        newEmbed.setFields([{ inline: true, name: '​​​', value: `→ [${i18n.modules.starboard.s_terms.jump_msg}](https://discord.com/channels/${guildId}/${ogMsg.channelId}/${ogMsg.id})` }]);
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

        const newmsg: any = await channel.sendMessage({ embed: newEmbed, allowedMentions: {}, content: `${this.emojiMention} ${this.getReactorCount()} - <#${ogMsg.channelId}>` });
        saveMessage(newmsg);
        this.publishData.messageId = newmsg.id;
        this.publishData.lastUpdate = Date.now();
        await this.updateStorage();
      } catch (e) {}
    }
    private async unpublish() {
      if (!this.publishData.channelId) {
        return;
      }
      const channel = await discord.getChannel(this.publishData.channelId);
      if (!channel || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      try {
        const oldMsg = await channel.getMessage(this.publishData.messageId!);
        if (oldMsg) {
          await oldMsg.delete();
        }
      } catch (e) {}
      delete this.publishData.messageId;
      delete this.publishData.lastUpdate;
      await this.updateStorage();
    }
    private async awardStats() {
      const stats = await statsKv.getAll<StarStats>();
      /* for (let i = 0; i < 15; i++) {
        this.reactors.push(utils.composeSnowflake());
      } */
      const uniqueReactors = this.reactors.filter((e) => e !== this.author).length;
      if (uniqueReactors === 0) {
        return;
      }
      let authorStats: StarStats | undefined = stats.find((e) => e.id === this.author);
      if (!authorStats) {
        authorStats = new StarStats(this.author);
        authorStats.received += uniqueReactors;
        authorStats.posts += 1;
        await statsKv.saveToPool(authorStats);
      } else {
        authorStats = utils.makeFake<StarStats>(authorStats, StarStats);
        authorStats.received += uniqueReactors;
        authorStats.posts += 1;
        await authorStats.update();
      }
      const nf = this.reactors.filter((reactor) => {
        const _e = stats.find((st) => st.id === reactor);
        return _e === undefined && reactor !== this.author;
      });
      async function reactorStats(t: StarredMessage) {
        if (nf.length > 0) {
          await Promise.all(nf.map(async (e) => {
            const obj = new StarStats(e);
            obj.given = 1;
            await statsKv.saveToPool(obj);
          }));
        }
        if (nf.length !== t.reactors.length) {
          const f = t.reactors.filter((e) => !nf.includes(e) && e !== t.author);
          if (f.length > 0) {
            await statsKv.editPools<StarStats>(f, (vl) => {
              vl.given += 1;
              return vl;
            });
          }
        }
      }
      if (this.reactors.length > 10) {
        await pylon.requestCpuBurst(async () => {
          await reactorStats(this);
        });
      } else {
        await reactorStats(this);
      }
    }
    private async needsUpdate() {
      const channel = await discord.getChannel(this.publishData.channelId!);

      if (!channel || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
        return;
      }
      const oldMsg = await channel.getMessage(this.publishData.messageId!);
      if (!oldMsg) {
        return false;
      }
      const split = oldMsg.content.split('-')[0].split(' ').join('').slice(-1);
      if (utils.isNumber(split) && utils.isNormalInteger(split, true)) {
        const _num = +split;
        return _num !== this.getReactorCount();
      }
      return false;
    }
    private async update(finalize = false) {
      const boardCfg = getBoardCfg(this.publishData.channelId!);
      try {
        const channel = await discord.getChannel(this.publishData.channelId!);
        if (!channel || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) {
          return;
        }

        const oldMsg = await channel.getMessage(this.publishData.messageId!);
        if (!oldMsg) {
          return;
        }
        const emb = oldMsg.embeds[0];
        if (typeof boardCfg.maxReacts === 'number') {
          emb.setColor(getColor(boardCfg.maxReacts, this.getReactorCount()));
        }
        if (finalize === true && emb.footer && !emb.footer.text.toLowerCase().includes(i18n.modules.starboard.s_terms.message_deleted.toLowerCase())) {
          emb.setFooter({ text: `${i18n.modules.starboard.s_terms.message_deleted} | ${emb.footer.text}` });
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
        await this.updateStorage();
      } catch (e) {}
    }
    async deleted(isLog = false) {
      await this.finalize();
      if (this.publishData.messageId) {
        const boardCfg = getBoardCfg(this.publishData.channelId!);
        if (typeof boardCfg.clearOnDelete === 'boolean' && boardCfg.clearOnDelete === true) {
          await this.unpublish();
        } else if (isLog === true && typeof boardCfg.clearOnModDelete === 'boolean' && boardCfg.clearOnModDelete === true) {
          await this.unpublish();
        } else {
          await this.update(true);
        }
      }
    }
    async finalize() {
      const boardCfg = getBoardCfg(this.publishData.channelId!);
      if (boardCfg.noStats === true) {
        return;
      }
      await this.awardStats();
    }
    async check() {
      const boardCfg = getBoardCfg(this.publishData.channelId!);
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
        if (diff >= 1500) {
          const upd = await this.needsUpdate();
          if (upd === true) {
            // update the board msg contents
            const chang = await this.update();
            return chang;
          }
        } else {
          await sleep(100 + Math.min(200, (2000 - diff)));

          await checkId(this.id);
        }
      }
      return false;
    }
}

async function checkId(key: string) {
  const val: any = await messagesKv.getById<StarredMessage>(key);
  if (val && val instanceof StarredMessage) {
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
  const keys = await messagesKv.getAll<StarredMessage>();
  await Promise.all(keys.map(async (e) => {
    const cfg = getBoardCfg(e.publishData.channelId!);
    const lifetime = typeof cfg.messageLifetime === 'number' ? Math.min(MAX_LIFETIME, Math.max(1, cfg.messageLifetime)) : MAX_LIFETIME;
    if (typeof cfg === 'object') {
      const messageId = e.id;
      const ts = utils.decomposeSnowflake(messageId).timestamp;
      const diff = Date.now() - ts;
      if (diff > 1000 * 60 * 60) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours >= lifetime) {
          await messagesKv.delete(e.id);
          await e.finalize();
        }
      }
    }
  }));
}

export async function clearData() {
  await messagesKv.clear();
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

/* export async function OnMessageCreate(
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
} */
export async function AL_OnMessageDelete(
  id: string,
  gid: string,
  log: any,
  messageDelete: discord.Event.IMessageDelete,
) {
  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }

  let msgData = await messagesKv.getById<StarredMessage>(messageDelete.id);
  if (msgData) {
    await messagesKv.delete(msgData.id);
    msgData = utils.makeFake<StarredMessage>(msgData, StarredMessage);
    await msgData.deleted(log instanceof discord.AuditLogEntry);
  }
}
export async function AL_OnMessageDeleteBulk(
  id: string,
  gid: string,
  log: any,
  messages: discord.Event.IMessageDeleteBulk,
) {
  const isLocked = await kv.get('lock');
  if (isLocked === true) {
    return;
  }
  let msgData = await messagesKv.getAll<StarredMessage>();
  msgData = msgData.filter((e) => messages.ids.includes(e.id));
  if (msgData.length > 0) {
    await messagesKv.editPools<StarredMessage>(msgData.map((v) => v.id), () => null);
    await Promise.all(msgData.map(async (key) => {
      key = utils.makeFake<StarredMessage>(key, StarredMessage);
      await key.deleted(log instanceof discord.AuditLogEntry);
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
  let board: string | boolean = false;
  if (!isBoardMsg) {
    board = getRespectiveBoard(reaction.channelId, emoji);
  }
  if (!isBoardMsg && board === false) {
    return;
  }
  let boardCfg;
  if (!isBoardMsg && typeof board === 'string') {
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
  if (!message) {
    return;
  }
  let actualMsg;
  if (isBoardMsg) {
    board = reaction.channelId;
    boardCfg = config.modules.starboard.channels[reaction.channelId];
    if (message.embeds.length === 1 && typeof message.embeds[0].footer === 'object' && message.embeds[0].footer !== null && typeof message.embeds[0].footer.text === 'string' && message.embeds[0].footer.text.length > 0) {
      const foot = message.embeds[0].footer.text;
      if (!foot.toLowerCase().includes(i18n.modules.starboard.s_terms.message_deleted.toLowerCase()) && foot.toLowerCase().includes(`${i18n.modules.starboard.s_terms.user.toLowerCase()}:`) && foot.toLowerCase().includes(`${i18n.modules.starboard.s_terms.message.toLowerCase()}:`)) {
        const messageid = foot.toLowerCase().split(' ').join('').split('|')[1].split(`${i18n.modules.starboard.s_terms.message.toLowerCase()}:`)[1];
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
  if (!me) {
    return;
  }
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
  const checkStorage: any = await messagesKv.getById<StarredMessage>(msgId);
  if (checkStorage !== undefined) {
    data = utils.makeFake(checkStorage, StarredMessage);
  } else {
    data = new StarredMessage(actualMsg.author.id, chanId, msgId, board, [], emoji.toMention!());
  }
  if (!data.reactors.includes(reaction.userId)) {
    data.reactors.push(reaction.userId);
  } else {
    if (processing.includes(msgId)) {
      processing.splice(processing.indexOf(msgId), 1);
    }
    return;
  }
  const check = await data.check();
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
  if (!isBoardMsg && typeof board === 'string') {
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
  if (!message) {
    return;
  }
  if (isBoardMsg) {
    board = reaction.channelId;
    boardCfg = config.modules.starboard.channels[reaction.channelId];
    if (message.embeds.length === 1 && typeof message.embeds[0].footer === 'object' && message.embeds[0].footer !== null && typeof message.embeds[0].footer.text === 'string' && message.embeds[0].footer.text.length > 0) {
      const foot = message.embeds[0].footer.text;
      if (!foot.toLowerCase().includes(i18n.modules.starboard.s_terms.message_deleted.toLowerCase()) && foot.toLowerCase().includes(`${i18n.modules.starboard.s_terms.user.toLowerCase()}:`) && foot.toLowerCase().includes(`${i18n.modules.starboard.s_terms.message.toLowerCase()}:`)) {
        const messageid = foot.toLowerCase().split(' ').join('').split('|')[1].split(`${i18n.modules.starboard.s_terms.message.toLowerCase()}:`)[1];
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
  const checkStorage = await messagesKv.getById<StarredMessage>(msgId);
  if (checkStorage !== undefined) {
    data = utils.makeFake(checkStorage, StarredMessage);
  } else {
    return;
  }
  if (data.reactors.includes(reaction.userId)) {
    data.reactors.splice(data.reactors.indexOf(reaction.userId), 1);
  } else {
    if (processing.includes(msgId)) {
      processing.splice(processing.indexOf(msgId), 1);
    }
    return;
  }
  const check = await data.check();
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
  const checkStorage = await messagesKv.getById<StarredMessage>(reaction.messageId);
  if (checkStorage !== undefined) {
    data = utils.makeFake(checkStorage, StarredMessage);
  } else {
    return;
  }
  if (data.reactors.length > 0) {
    data.reactors = [];
  } else {
    if (processing.includes(reaction.messageId)) {
      processing.splice(processing.indexOf(reaction.messageId), 1);
    }
    return;
  }
  const check = await data.check();
  if (processing.includes(reaction.messageId)) {
    processing.splice(processing.indexOf(reaction.messageId), 1);
  }
}
export function InitializeCommands() {
  const _groupOptions = {
    description: 'Starboard Commands',
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );

  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  registerChatSubCallback(cmdGroup, 'stars', (subCommandGroup) => {
    registerChatOn(
      subCommandGroup,
      'stats',
      (ctx) => ({ user: ctx.userOptional() }),
      async (msg, { user }) => {
        const res: any = await msg.inlineReply(async () => {
          const emb = new discord.Embed();
          if (user === null) {
          // leaderboard
            let stats = await statsKv.getAll<StarStats>();
            stats = stats.sort((a, b) => b.received - a.received);
            const top10 = stats.slice(0, Math.min(stats.length, 10));
            // const theirRank = stats.findIndex((it) => it.id === msg.author.id);
            const txt = [];
            const usrs: Array<discord.User> = [];
            await Promise.all(top10.map(async (vl) => {
              const _thisusr = await utils.getUser(vl.id);
              if (_thisusr !== null) {
                usrs.push(_thisusr);
              }
            }));
            for (let i = 0; i < top10.length; i++) {
              const st = top10[i];
              const me = st.id === msg.author.id;
              let pos = '';
              let tag = st.id;
              const _u = usrs.find((u) => u.id === st.id);
              if (_u) {
                tag = utils.escapeString(_u.getTag());
              }
              if (me === true) {
                tag = `**${tag}**`;
              }
              if (i === 0) {
                pos = discord.decor.Emojis.FIRST_PLACE_MEDAL;
              } else if (i === 1) {
                pos = discord.decor.Emojis.SECOND_PLACE_MEDAL;
              } else if (i === 2) {
                pos = discord.decor.Emojis.THIRD_PLACE_MEDAL;
              } else {
                pos = `\` ${i.toString()} \``;
              }
              txt.push(`${pos} ${tag} - ${st.received} ${i18n.modules.starboard.s_terms.stars.toLowerCase()}`);
            }
            const isTop = top10.find((st) => st.id === msg.author.id);
            if (!isTop) {
              const ind = stats.findIndex((st) => st.id === msg.author.id);
              if (ind > -1) {
                txt.push('...', `\`${ind + 1}\` - ${utils.escapeString(msg.author.getTag())}`);
              }
            }
            const allStars = stats.reduce((a, b) => a + b.received, 0);

            emb.setDescription(`${discord.decor.Emojis.TROPHY} **${i18n.modules.starboard.s_terms.leaderboard}**\n\n${discord.decor.Emojis.STAR} **${allStars}**\n${discord.decor.Emojis.BLOND_HAIRED_PERSON} **${stats.length}**\n\n${discord.decor.Emojis.CHART_WITH_UPWARDS_TREND} **${i18n.modules.starboard.s_terms.ranks}**\n${txt.join('\n')}`);
          } else {
            const stats = await statsKv.getById<StarStats>(user.id);
            if (typeof stats === 'undefined') {
              return { content: setPlaceholders(i18n.modules.starboard.stars_stats.no_stats, ['user_mention', msg.author.toMention()]) };
            }
            emb.setAuthor({ name: user.getTag(), iconUrl: user.getAvatarUrl() });
            emb.setColor(0xe1eb34);
            emb.setDescription(`⭐ **${i18n.modules.starboard.s_terms.received}** - **${stats.received}**\n⭐ **${i18n.modules.starboard.s_terms.given}** - **${stats.given}**\n⭐ **${i18n.modules.starboard.s_terms.starred_posts}** - **${stats.posts}**`);
          }

          return { content: '', allowedMentions: {}, embed: emb };
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'starboards.stars.stats',
          level: Ranks.Authorized,
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'block',
      (ctx) => ({ user: ctx.user() }),
      async (msg, { user }) => {
        const res: any = await msg.inlineReply(async () => {
          const isb = await isBlocked(user.id);
          if (isb === true) {
            return setPlaceholders(i18n.modules.starboard.stars_block.already_blocked, ['user_mention', user.toMention()]);
          }
          let blocks = await kv.get('blocks');
          if (!Array.isArray(blocks)) {
            blocks = [];
          }
          blocks.push(user.id);
          await kv.put('blocks', blocks);
          return setPlaceholders(i18n.modules.starboard.stars_block.blocked, ['user_mention', user.toMention()]);
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'starboards.stars.block',
          level: Ranks.Moderator,
        },
      },
    );
    registerChatOn(
      subCommandGroup,
      'unblock',
      (ctx) => ({ user: ctx.user() }),
      async (msg, { user }) => {
        const res: any = await msg.inlineReply(async () => {
          const isb = await isBlocked(user.id);
          if (isb === false) {
            return setPlaceholders(i18n.modules.starboard.stars_unblock.not_blocked, ['user_mention', user.toMention()]);
          }
          let blocks = await kv.get('blocks');
          if (!Array.isArray(blocks)) {
            blocks = [];
          }
          blocks.splice(blocks.indexOf(user.id), 1);
          await kv.put('blocks', blocks);
          return setPlaceholders(i18n.modules.starboard.stars_unblock.unblocked, ['user_mention', user.toMention()]);
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'starboards.stars.unblock',
          level: Ranks.Moderator,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      'lock',
      async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const lock: any = await kv.get('lock');
          if (lock === true) {
            return i18n.modules.starboard.stars_lock.already_locked;
          }
          await kv.put('lock', true);
          return i18n.modules.starboard.stars_lock.locked;
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'starboards.stars.lock',
          level: Ranks.Administrator,
        },
      },
    );
    registerChatRaw(
      subCommandGroup,
      'unlock',
      async (msg) => {
        const res: any = await msg.inlineReply(async () => {
          const lock: any = await kv.get('lock');
          if (typeof lock === 'undefined' || (typeof lock === 'boolean' && lock === false)) {
            return i18n.modules.starboard.stars_unlock.not_locked;
          }
          await kv.put('lock', false);
          return i18n.modules.starboard.stars_unlock.unlocked;
        });
        saveMessage(res);
      },
      {
        permissions: {
          overrideableInfo: 'starboards.stars.unlock',
          level: Ranks.Administrator,
        },
      },
    );
  });
  return cmdGroup;
}

const starsGroup = registerSlashGroup({ name: 'stars', description: 'Starboard commands' }, { module: 'starboard' });

if (starsGroup) {
  registerSlashSub(
    starsGroup,
    { name: 'stats', description: 'Get starboard statistics for a user', options: (ctx) => ({ user: ctx.guildMember({ required: false, description: 'The user to get data on' }) }) },
    async (inter, { user }) => {
      const emb = new discord.Embed();
      if (!user) {
      // leaderboard
        let stats = await statsKv.getAll<StarStats>();
        stats = stats.sort((a, b) => b.received - a.received);
        const top10 = stats.slice(0, Math.min(stats.length, 10));
        const txt = [];
        const usrs: Array<discord.User> = [];
        await Promise.all(top10.map(async (vl) => {
          const _thisusr = await utils.getUser(vl.id);
          if (_thisusr !== null) {
            usrs.push(_thisusr);
          }
        }));
        for (let i = 0; i < top10.length; i++) {
          const st = top10[i];
          const me = st.id === inter.member.user.id;
          let pos = '';
          let tag = st.id;
          const _u = usrs.find((u) => u.id === st.id);
          if (_u) {
            tag = utils.escapeString(_u.getTag());
          }
          if (me === true) {
            tag = `**${tag}**`;
          }
          if (i === 0) {
            pos = discord.decor.Emojis.FIRST_PLACE_MEDAL;
          } else if (i === 1) {
            pos = discord.decor.Emojis.SECOND_PLACE_MEDAL;
          } else if (i === 2) {
            pos = discord.decor.Emojis.THIRD_PLACE_MEDAL;
          } else {
            pos = `\` ${i.toString()} \``;
          }
          txt.push(`${pos} ${tag} - ${st.received} ${i18n.modules.starboard.s_terms.stars.toLowerCase()}`);
        }
        const isTop = top10.find((st) => st.id === inter.member.user.id);
        if (!isTop) {
          const ind = stats.findIndex((st) => st.id === inter.member.user.id);
          if (ind > -1) {
            txt.push('...', `\`${ind + 1}\` - ${utils.escapeString(inter.member.user.getTag())}`);
          }
        }
        const allStars = stats.reduce((a, b) => a + b.received, 0);

        emb.setDescription(`${discord.decor.Emojis.TROPHY} **${i18n.modules.starboard.s_terms.leaderboard}**\n\n${discord.decor.Emojis.STAR} **${allStars}**\n${discord.decor.Emojis.BLOND_HAIRED_PERSON} **${stats.length}**\n\n${discord.decor.Emojis.CHART_WITH_UPWARDS_TREND} **${i18n.modules.starboard.s_terms.ranks}**\n${txt.join('\n')}`);
      } else {
        user = user.user;
        const stats = await statsKv.getById<StarStats>(user.id);
        if (typeof stats === 'undefined') {
          await inter.acknowledge({ ephemeral: true });
          await inter.respondEphemeral(setPlaceholders(i18n.modules.starboard.stars_stats.no_stats, ['user_mention', user.toMention()]));
          return false;
        }
        emb.setAuthor({ name: user.getTag(), iconUrl: user.getAvatarUrl() });
        emb.setColor(0xe1eb34);
        emb.setDescription(`⭐ **${i18n.modules.starboard.s_terms.received}** - **${stats.received}**\n⭐ **${i18n.modules.starboard.s_terms.given}** - **${stats.given}**\n⭐ **${i18n.modules.starboard.s_terms.starred_posts}** - **${stats.posts}**`);
      }
      await inter.acknowledge({ ephemeral: false });

      await interactionChannelRespond(inter, { content: '', allowedMentions: {}, embed: emb });
    },
    {
      parent: 'stars',
      module: 'starboard',
      permissions: {
        overrideableInfo: 'starboard.stars.stats',
        level: Ranks.Authorized,
      },
    },
  );

  registerSlashSub(
    starsGroup,
    { name: 'block', description: 'Blocks a user from starboard', options: (ctx) => ({ user: ctx.guildMember({ required: true, description: 'The user to block' }) }) },
    async (inter, { user }) => {
      user = user.user;
      const isb = await isBlocked(user.id);
      if (isb === true) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(setPlaceholders(i18n.modules.starboard.stars_block.already_blocked, ['user_mention', user.toMention()]));
        return false;
      }
      let blocks = await kv.get('blocks');
      if (!Array.isArray(blocks)) {
        blocks = [];
      }
      await inter.acknowledge({ ephemeral: false });
      blocks.push(user.id);
      await kv.put('blocks', blocks);
      await interactionChannelRespond(inter, setPlaceholders(i18n.modules.starboard.stars_block.blocked, ['user_mention', user.toMention()]));
    },
    {
      parent: 'stars',
      module: 'starboard',
      permissions: {
        overrideableInfo: 'starboard.stars.block',
        level: Ranks.Moderator,
      },
    },
  );

  registerSlashSub(
    starsGroup,
    { name: 'unblock', description: 'Unblocks a user from starboard', options: (ctx) => ({ user: ctx.guildMember({ required: true, description: 'The user to unblock' }) }) },
    async (inter, { user }) => {
      user = user.user;
      const isb = await isBlocked(user.id);
      if (isb === false) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(setPlaceholders(i18n.modules.starboard.stars_unblock.not_blocked, ['user_mention', user.toMention()]));
        return false;
      }
      let blocks = await kv.get('blocks');
      if (!Array.isArray(blocks)) {
        blocks = [];
      }
      await inter.acknowledge({ ephemeral: false });
      blocks.splice(blocks.indexOf(user.id), 1);
      await kv.put('blocks', blocks);
      await interactionChannelRespond(inter, setPlaceholders(i18n.modules.starboard.stars_unblock.unblocked, ['user_mention', user.toMention()]));
    },
    {
      parent: 'stars',
      module: 'starboard',
      permissions: {
        overrideableInfo: 'starboard.stars.unblock',
        level: Ranks.Moderator,
      },
    },
  );

  registerSlashSub(
    starsGroup,
    { name: 'lock', description: 'Locks the starboard' },
    async (inter) => {
      const lock: any = await kv.get('lock');
      if (lock === true) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.starboard.stars_lock.already_locked);
        return false;
      }
      await kv.put('lock', true);
      await interactionChannelRespond(inter, i18n.modules.starboard.stars_lock.locked);
    },
    {
      parent: 'stars',
      module: 'starboard',
      permissions: {
        overrideableInfo: 'starboard.stars.lock',
        level: Ranks.Administrator,
      },
    },
  );

  registerSlashSub(
    starsGroup,
    { name: 'unlock', description: 'Unlocks the starboard' },
    async (inter) => {
      const lock: any = await kv.get('lock');
      if (typeof lock === 'undefined' || (typeof lock === 'boolean' && lock === false)) {
        await inter.acknowledge({ ephemeral: true });
        await inter.respondEphemeral(i18n.modules.starboard.stars_unlock.not_locked);
        return false;
      }
      await kv.put('lock', false);
      await interactionChannelRespond(inter, i18n.modules.starboard.stars_unlock.unlocked);
    },
    {
      parent: 'stars',
      module: 'starboard',
      permissions: {
        overrideableInfo: 'starboard.stars.unlock',
        level: Ranks.Administrator,
      },
    },
  );
}
