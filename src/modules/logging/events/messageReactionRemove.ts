import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser } from '../main';
import * as utils from '../../../lib/utils';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IMessageReactionRemove,
) {
  if (ev.userId && ev.userId !== null && isIgnoredUser(ev.userId)) {
    return [];
  }
  if (ev.guildId === null || ev.guildId === undefined) {
    return ['dmReaction'];
  }
  if (isIgnoredChannel(ev.channelId)) {
    return [];
  }
  return ['guildReaction'];
}

export function isAuditLog(log: discord.AuditLogEntry) {
  return false;
}

export const messages = {
  async guildReaction(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageReactionRemove,
  ) {
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();
    const emj = ev.emoji;
    let mention = emj.toMention();
    if (emj.type === discord.Emoji.Type.GUILD) {
      mention = `https://cdn.discordapp.com/emojis/${emj.id}.png?v=1`;
      const data = await (await fetch(mention)).arrayBuffer();
      mp.set('ATTACHMENTS', [{ name: `emoji.${mention.split('.').slice(-1)[0].split('?')[0]}`, data, url: mention }]);
      mention = '';
    }
    mp.set('TYPE', 'REMOVED_REACTION');
    mp.set('CHANNEL_ID', ev.channelId);
    mp.set('MESSAGE_ID', ev.messageId);
    mp.set('EMOJI_MENTION', mention);
    mp.set('USERTAG', getMemberTag(ev.member));
    mp.set('USER_ID', ev.userId);
    mp.set('USER', ev.member.user);
    return mp;
  },
  async dmReaction(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageReactionRemove,
  ) {
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();
    const emj = ev.emoji;
    let mention = emj.toMention();
    const _usr = await utils.getUser(ev.userId);
    if (emj.type === discord.Emoji.Type.GUILD) {
      mention = `https://cdn.discordapp.com/emojis/${emj.id}.png?v=1`;
      const data = await (await fetch(mention)).arrayBuffer();
      mp.set('ATTACHMENTS', [{ name: `emoji.${mention.split('.').slice(-1)[0].split('?')[0]}`, data, url: mention }]);
      mention = '';
    }
    mp.set('TYPE', 'REMOVED_REACTION');
    mp.set('CHANNEL_ID', ev.channelId);
    mp.set('MESSAGE_ID', ev.messageId);
    mp.set('EMOJI_MENTION', mention);
    mp.set('USERTAG', getUserTag(_usr));
    mp.set('USER', _usr);
    return mp;
  },
};

export async function OnMessageReactionRemove(
  id: string,
  guildId: string,
  ev: discord.Event.IMessageReactionRemove,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.MESSAGE_REACTION_REMOVE,
    null,
    ev,
  );
}
