import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser, isMaster } from '../main';
import * as utils from '../../../lib/utils';
import * as utils2 from '../utils';

export function getKeys(
  log: discord.AuditLogEntry,
  message: discord.Message.AnyMessage,
  oldMessage: discord.Message.AnyMessage | null,
) {
  if (oldMessage === null) {
    return [];
  }
  if (isIgnoredUser(message.author)) {
    return [];
  }
  const ret = new Array<string>();
  if (message.guildId === null) {
    // dms
    if (message.content !== oldMessage.content && isMaster()) {
      ret.push('dmMessageContent');
    }
  } else if (message.content !== oldMessage.content) {
    if (isIgnoredChannel(message.channelId)) {
      return [];
    }
    ret.push('guildMessageContent');
  }
  return ret;
}

export const messages = {
  async guildMessageContent(
    log: discord.AuditLogEntry,
    message: discord.Message,
    oldMessage: discord.Message.AnyMessage | null,
  ) {
    if (message.author === null || !(oldMessage instanceof discord.Message)) {
      return;
    }
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();
    mp.set('AUTHOR', getMemberTag(message.member));
    mp.set('USERTAG', getMemberTag(message.member));
    mp.set('USER', message.author);
    mp.set('USER_ID', message.author.id);
    mp.set('TYPE', 'MESSAGE_CONTENT_UPDATED_GUILD');
    mp.set('CHANNEL_ID', message.channelId);
    mp.set(
      'CONTENT_BEFORE',
      await utils2.parseMessageContent(oldMessage, true),
    );
    mp.set('CONTENT_AFTER', await utils2.parseMessageContent(message, true));
    mp.set('MESSAGE_ID', message.id);
    return mp;
  },
  async dmMessageContent(
    log: discord.AuditLogEntry,
    message: discord.Message,
    oldMessage: discord.Message | null,
  ) {
    if (message.author === null || !(oldMessage instanceof discord.Message)) {
      return;
    }
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();
    mp.set('AUTHOR', getUserTag(message.author));
    mp.set('USERTAG', getUserTag(message.author));
    mp.set('USER', message.author);
    mp.set('USER_ID', message.author.id);
    mp.set('TYPE', 'MESSAGE_CONTENT_UPDATED_DM');
    mp.set('CHANNEL_ID', message.channelId);
    mp.set(
      'CONTENT_BEFORE',
      await utils2.parseMessageContent(oldMessage, true),
    );
    mp.set('CONTENT_AFTER', await utils2.parseMessageContent(message, true));
    mp.set('MESSAGE_ID', message.id);
    return mp;
  },
};

export async function OnMessageUpdate(
  id: string,
  guildId: string,
  message: discord.Message.AnyMessage,
  oldMessage: discord.Message.AnyMessage | null,
) {
  if (oldMessage === null) {
    return;
  }
  await handleEvent(
    id,
    guildId,
    discord.Event.MESSAGE_UPDATE,
    null,
    message,
    oldMessage,
  );
}
