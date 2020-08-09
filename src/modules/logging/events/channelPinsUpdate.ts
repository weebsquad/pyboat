import { handleEvent, getUserTag, getMemberTag, isIgnoredChannel, isIgnoredUser } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IChannelPinsUpdate,
) {
  if (isIgnoredChannel(ev.channelId)) {
    return [];
  }
  if (log instanceof discord.AuditLogEntry && isIgnoredUser(log.targetId)) {
    return [];
  }
  if (ev.lastPinTimestamp === undefined) {
    return ['unpin'];
  }
  return ['pin'];
}

export function isAuditLog(log: discord.AuditLogEntry, key: string) {
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  async pin(
    log: discord.AuditLogEntry.MessagePin,
    ev: discord.Event.IChannelPinsUpdate,
  ) {
    if (!(log instanceof discord.AuditLogEntry.MessagePin)) {
      return;
    }
    const _usr = await discord.getUser(log.targetId);
    const mp = new Map([
      ['_TYPE_', 'MESSAGE_PINNED'],
      ['_CHANNEL_ID_', ev.channelId],
      ['_MESSAGE_ID_', log.options.messageId],
    ]);
    mp.set('_USERTAG_', '');
    if (_usr !== null) {
      mp.set('_USERTAG_', getUserTag(_usr));
    }
    return mp;
  },
  async unpin(
    log: discord.AuditLogEntry.MessageUnpin,
    ev: discord.Event.IChannelPinsUpdate,
  ) {
    if (!(log instanceof discord.AuditLogEntry.MessageUnpin)) {
      return;
    }
    const _usr = await discord.getUser(log.targetId);
    const mp = new Map([
      ['_TYPE_', 'MESSAGE_UNPINNED'],
      ['_CHANNEL_ID_', ev.channelId],
      ['_MESSAGE_ID_', log.options.messageId],
    ]);
    mp.set('_USERTAG_', '');
    if (_usr !== null) {
      mp.set('_USERTAG_', getUserTag(_usr));
    }
    return mp;
  },
};

export async function AL_OnChannelPinsUpdate(
  id: string,
  guildId: string,
  log: any,
  ev: discord.Event.IChannelPinsUpdate,
) {
  await handleEvent(id, guildId, discord.Event.CHANNEL_PINS_UPDATE, log, ev);
}
