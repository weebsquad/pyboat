import * as utils from '../lib/utils';
import {config, globalConfig, guildId} from '../config';

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
    constructor(channelId: string, messageId: string, reactors: Array<string>) {
        this.id = messageId;
        this.channelId = channelId;
        this.reactors = reactors;
        this.publishData = new PublishData;
        const board = getRespectiveBoard(channelId);
        if(board !== false) this.publishData.channelId = board;
        return this;
    }
    private async publish() {
        console.log('publish');
        const channel = await discord.getChannel(this.publishData.channelId);
        const ogChannel = await discord.getChannel(this.channelId);
        if((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS) || (ogChannel.type !== discord.Channel.Type.GUILD_TEXT && ogChannel.type !== discord.Channel.Type.GUILD_NEWS)) return;
        const ogMsg = await ogChannel.getMessage(this.id);
        const newmsg = await channel.sendMessage({allowedMentions: {}, content: `${this.reactors.length} - **Board message by** ${ogMsg.author.toMention()}\n\n${utils.escapeString(ogMsg)}`});
        this.publishData.messageId = newmsg.id;
        this.publishData.lastUpdate = Date.now();
    }
    private async update() {
        console.log('update');
        const channel = await discord.getChannel(this.publishData.channelId);
        if((channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) return;
        const oldMsg = await channel.getMessage(this.publishData.messageId);
        const split = oldMsg.content.split('\n')[0];
        console.log(split);
    }
    async check() {
        const boardCfg = getBoardCfg(this.publishData.channelId);
        if(this.reactors.length >= boardCfg.minReacts) {
            if(!this.publishData.messageId) {
            // publish
            await this.publish();
            }
        } else {
            if(this.publishData.messageId) {
                // unpublish
            }
        }
        if(this.publishData.messageId && this.publishData.lastUpdate) {
            const diff = Date.now() - this.publishData.lastUpdate;
            if(diff >= 3000) {
                // update the board msg contents
                await this.update();
            }
        }
    }
}
export class UserStats {
    userId: string;
    given: number;
    received: number;
}
function getRespectiveBoard(source: string) {
    if(typeof(config.modules.starboard.channels) === 'object') {
        for(const key in config.modules.starboard.channels) {
            const val = config.modules.starboard.channels[key];
            if(Array.isArray(val.excludes) && val.excludes.includes(source)) continue;
            if(!Array.isArray(val.includes) || val.includes.length === 0) return key;
            if(val.includes.includes(source)) return key;
        }
    }
    return false;
}
function getBoardCfg(channelId: string) {
    if(typeof(config.modules.starboard.channels) === 'object') {
        if(typeof(config.modules.starboard.channels[channelId]) === 'object') {
            return config.modules.starboard.channels[channelId];
        }
    }
    return false;
}
const prefixKv = 'Starboard_';
let processing = [];
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
  ) {}
export async function OnMessageReactionAdd(
    id: string,
    gid: string,
    reaction: discord.Event.IMessageReactionAdd,
  ) {
      if(!(reaction.member instanceof discord.GuildMember)) return;
      if(reaction.member.user.bot === true) return;
      if(utils.isBlacklisted(reaction.member.user.id)) return;
      const board = getRespectiveBoard(reaction.channelId);
      if(board === false) return;
        const boardCfg = getBoardCfg(board);
        if(boardCfg === false) return;
        
      
      const emoji = reaction.emoji;
      if(utils.isNumber(boardCfg.emoji)) {
          if(emoji.id !== boardCfg.emoji) return;
      } else if(emoji.name !== boardCfg.emoji) {
          return;
      }
      

      const channel = await discord.getChannel(reaction.channelId);
      if(channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) return;
      const message = await channel.getMessage(reaction.messageId);
      const me = await (await channel.getGuild()).getMember(discord.getBotId());
      if(typeof boardCfg.preventSelf === 'boolean' && boardCfg.preventSelf === true && reaction.member.user.id === message.author.id) {
        if(channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) await message.deleteReaction(`${emoji.type === discord.Emoji.Type.UNICODE ? emoji.name : `${emoji.name}:${emoji.id}`}`, reaction.member.user);
        
        return;
      }
      if(typeof boardCfg.level === 'number' && boardCfg.level > 0) {
        const canRun = await utils.canMemberRun(boardCfg.level, reaction.member);
        if(!canRun) {
            if(channel.canMember(me, discord.Permissions.MANAGE_MESSAGES)) await message.deleteReaction(`${emoji.type === discord.Emoji.Type.UNICODE ? emoji.name : `${emoji.name}:${emoji.id}`}`, reaction.member.user);
            return;
        }
      }
      /*const reactions = message.reactions.filter((e) => {
          return e.emoji.name === emoji.name && e.emoji.id === emoji.id
      });
      if(reactions.length !== 1) return;
      const messageReacts = reactions[0];*/
      let reactors = [];
      for await (const item of message.iterReactions(`${emoji.type === discord.Emoji.Type.UNICODE ? emoji.name : `${emoji.name}:${emoji.id}`}`)) {
        if(typeof boardCfg.preventSelf === 'boolean' && boardCfg.preventSelf === true && reaction.member.user.id === message.author.id) continue;
        reactors.push(item.id);
      }
      //if(reactors.length < boardCfg.minReacts) return;
      while(processing.includes(reaction.messageId)) {
        await sleep(200);
    }
    if(!processing.includes(reaction.messageId)) processing.push(reaction.messageId);
    let data;
    const checkStorage: any = (await utils.KVManager.get(`${prefixKv}${reaction.messageId}`));
    if(checkStorage !== undefined) { data = utils.makeFake(checkStorage, StarredMessage); } else {
        data = new StarredMessage(reaction.channelId, reaction.messageId, reactors);
    }
    await data.check();
    console.log(data);
    await utils.KVManager.set(`${prefixKv}${reaction.messageId}`, data);
    if(processing.includes(reaction.messageId)) processing.splice(processing.indexOf(reaction.messageId), 1);
  }
  export async function OnMessageReactionRemove(id: string, gid: string, reaction: discord.Event.IMessageReactionRemove) {
    if(!(reaction.member instanceof discord.GuildMember)) return;
    const emoji = reaction.emoji;
      const channel = await discord.getChannel(reaction.channelId);
      if(channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) return;
      const message = await channel.getMessage(reaction.messageId);
      //console.log(message);
  }

  export async function OnMessageReactionRemoveAll(id: string, gid: string, reaction: discord.Event.IMessageReactionRemoveAll) {
    if(!reaction.guildId) return;
      const channel = await discord.getChannel(reaction.channelId);
      if(channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) return;
      const message = await channel.getMessage(reaction.messageId);
      //console.log(message);

  }