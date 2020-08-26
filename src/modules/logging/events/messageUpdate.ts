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
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map();
    mp.set('_AUTHOR_', getUserTag(message.author));
    mp.set('_USERTAG_', getUserTag(message.author));
    mp.set('_USER_ID_', message.author.id);
    mp.set('_TYPE_', 'MESSAGE_CONTENT_UPDATED_GUILD');
    mp.set('_CHANNEL_ID_', message.channelId);
    mp.set(
      '_CONTENT_BEFORE_',
      await utils2.parseMessageContent(oldMessage, true),
    );
    mp.set('_CONTENT_AFTER_', await utils2.parseMessageContent(message, true));
    mp.set('_MESSAGE_ID_', message.id);
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
    // let mp = new Map([['_USERTAG_', getUserTag(member)]]);
    const mp = new Map();
    mp.set('_AUTHOR_', getUserTag(message.author));
    mp.set('_USERTAG_', getUserTag(message.author));
    mp.set('_USER_ID_', message.author.id);
    mp.set('_TYPE_', 'MESSAGE_CONTENT_UPDATED_DM');
    mp.set('_CHANNEL_ID_', message.channelId);
    mp.set(
      '_CONTENT_BEFORE_',
      await utils2.parseMessageContent(oldMessage, true),
    );
    mp.set('_CONTENT_AFTER_', await utils2.parseMessageContent(message, true));
    mp.set('_MESSAGE_ID_', message.id);
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
