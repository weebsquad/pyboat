import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser, isMaster } from '../main';
import * as utils from '../../../lib/utils';
import * as utils2 from '../utils';
import { language as i18n, setPlaceholders } from '../../../localization/interface';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IMessageDelete,
  msg: discord.Message.AnyMessage | null,
) {
  if (msg !== null && isIgnoredUser(msg.author.id)) {
    return [];
  }
  if (ev.guildId) {
    if (isIgnoredChannel(ev.channelId)) {
      return [];
    }
    if (
      log instanceof discord.AuditLogEntry
      && log.actionType === discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD
    ) {
      return [];
    } // user was banned so lets not bother with logging stuff
    if (msg === null) {
      return ['messageDeletedGuildNoCache'];
    }
    if (msg.webhookId !== null) {
      return ['messageDeletedGuildWebhook'];
    }
    return ['messageDeletedGuild'];
  }
  if (!isMaster()) {
    return [];
  }
  if (msg === null) {
    return ['messageDeletedNoCache'];
  }
  return ['messageDeleted'];
}

export function isAuditLog(
  log: discord.AuditLogEntry,
  key: string,
  ...args: any
) {
  if (
    [
      'messageDeleted',
      'messageDeletedNoCache',
      'messageDeletedGuildNoCache',
      'messageDeletedGuildWebhook',
    ].includes(key)
  ) {
    return false;
  }
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  async messageDeleted(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageDelete,
    msg: discord.Message,
  ) {
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();

    mp.set('AUTHOR', getUserTag(msg.author));
    mp.set('USER_ID', msg.author.id);
    mp.set('USERTAG', getUserTag(msg.author));
    mp.set('USER', msg.author);
    mp.set('TYPE', 'MESSAGE_DELETED_DM');
    mp.set('CONTENT', await utils2.parseMessageContent(msg));
    mp.set('CHANNEL_ID', ev.channelId);
    mp.set('MESSAGE_ID', ev.id);
    return mp;
  },

  async messageDeletedGuild(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageDelete,
    msg: discord.GuildMemberMessage,
  ) {
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();
    mp.set('AUTHOR', getUserTag(msg.author));
    mp.set('USER_ID', msg.author.id);
    mp.set('USERTAG', getUserTag(msg.author));
    mp.set('USER', msg.author);
    mp.set('TYPE', 'MESSAGE_DELETED_GUILD');
    mp.set('CHANNEL_ID', ev.channelId);
    mp.set('CONTENT', await utils2.parseMessageContent(msg));
    mp.set('MESSAGE_ID', ev.id);
    return mp;
  },
  async messageDeletedGuildWebhook(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageDelete,
    msg: discord.Message,
  ) {
    // let mp = new Map([['USERTAG', getUserTag(member)]]);
    const mp = new Map();

    mp.set('AUTHOR', `${i18n.modules.logging.l_terms.webhook} #${msg.webhookId}`);
    // mp.set('USERTAG', `Webhook #${msg.webhookId}`);
    mp.set('TYPE', 'MESSAGE_DELETED_GUILD_WEBHOOK');
    mp.set('CHANNEL_ID', ev.channelId);
    mp.set('CONTENT', await utils2.parseMessageContent(msg));
    mp.set('MESSAGE_ID', ev.id);
    return mp;
  },
  messageDeletedNoCache(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageDelete,
  ) {
    const mp = new Map();
    mp.set('TYPE', 'MESSAGE_DELETED_DM_NO_CACHE');
    mp.set('MESSAGE_ID', ev.id);
    return mp;
  },
  messageDeletedGuildNoCache(
    log: discord.AuditLogEntry,
    ev: discord.Event.IMessageDelete,
  ) {
    const mp = new Map();
    mp.set('TYPE', 'MESSAGE_DELETED_GUILD_NO_CACHE');
    mp.set('CHANNEL_ID', ev.channelId);
    mp.set('MESSAGE_ID', ev.id);
    return mp;
  },
};

export async function AL_OnMessageDelete(
  id: string,
  guildId: string,
  log: any,
  ev: discord.Event.IMessageDelete,
  oldMessage: discord.Message.AnyMessage | null,
) {
  if (oldMessage && oldMessage.type !== discord.Message.Type.DEFAULT) {
    return;
  }
  await handleEvent(
    id,
    guildId,
    discord.Event.MESSAGE_DELETE,
    log,
    ev,
    oldMessage,
  );
}
