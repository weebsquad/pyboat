import * as utils from '../lib/utils';

export class PublishData {
    published: boolean = false;
    channelId: string;
    messageId: string;
}
export class StarredMessage {
    id: string;
    publishData: PublishData;
    starUsers: Array<string> = [];

}
export class UserStats {
    userId: string;
    given: number;
    received: number;
}
const prefixKv = 'Starboard_';
export async function OnMessageDelete(
    id: string,
    guildId: string,
    messageDelete: discord.Event.IMessageDelete,
    oldMessage: discord.Message,
  ) {}
export async function OnMessageDeleteBulk(
    id: string,
    guildId: string,
    messages: discord.Event.IMessageDeleteBulk,
  ) {}
export async function OnMessageReactionAdd(
    id: string,
    guildId: string,
    reaction: discord.Event.IMessageReactionAdd,
  ) {
      if(!(reaction.member instanceof discord.GuildMember)) return;
      const emoji = reaction.emoji;
      const channel = await discord.getChannel(reaction.channelId);
      if(channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) return;
      const message = await channel.getMessage(reaction.messageId);
      console.log(message);
  }
  export async function OnMessageReactionRemove(id: string, guildId: string, reaction: discord.Event.IMessageReactionRemove) {
    if(!(reaction.member instanceof discord.GuildMember)) return;
    const emoji = reaction.emoji;
      const channel = await discord.getChannel(reaction.channelId);
      if(channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) return;
      const message = await channel.getMessage(reaction.messageId);
      console.log(message);
  }

  export async function OnMessageReactionRemoveAll(id: string, guildId: string, reaction: discord.Event.IMessageReactionRemoveAll) {
    if(!reaction.guildId) return;
      const channel = await discord.getChannel(reaction.channelId);
      if(channel === null || (channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS)) return;
      const message = await channel.getMessage(reaction.messageId);
      console.log(message);

  }