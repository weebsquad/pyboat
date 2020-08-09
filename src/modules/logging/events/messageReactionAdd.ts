import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IMessageReactionAdd,
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
    ev: discord.Event.IMessageReactionAdd,
  ) {
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map();
    const emj = ev.emoji;
    let mention = emj.toMention();
    if (emj.type === discord.Emoji.Type.GUILD) {
      mention = `https://cdn.discordapp.com/emojis/${emj.id}.png?v=1`;
    }
    mp.set('_TYPE_', 'ADD_REACTION');
    mp.set('_CHANNEL_ID_', ev.channelId);
    mp.set('_MESSAGE_ID_', ev.messageId);
    mp.set('_EMOJI_MENTION_', mention);
    mp.set('_USERTAG_', getMemberTag(ev.member));
    return mp;
  },
  async dmReaction(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageReactionAdd,
  ) {
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map();
    const emj = ev.emoji;
    let mention = emj.toMention();
    const _usr = await discord.getUser(ev.userId);
    if (emj.type === discord.Emoji.Type.GUILD) {
      mention = `https://cdn.discordapp.com/emojis/${emj.id}.png?v=1`;
    }
    mp.set('_TYPE_', 'ADD_REACTION');
    mp.set('_CHANNEL_ID_', ev.channelId);
    mp.set('_MESSAGE_ID_', ev.messageId);
    mp.set('_EMOJI_MENTION_', mention);
    mp.set('_USERTAG_', getUserTag(_usr));
    return mp;
  },
};

export async function OnMessageReactionAdd(
  id: string,
  guildId: string,
  ev: discord.Event.IMessageReactionAdd,
) {
  await handleEvent(id, guildId, discord.Event.MESSAGE_REACTION_ADD, null, ev);
}
