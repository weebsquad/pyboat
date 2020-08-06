import { handleEvent, getUserTag, getMemberTag } from '../main';

export function getKeys(
  log: discord.AuditLogEntry,
  ev: discord.Event.IChannelPinsUpdate
) {
  if (ev.lastPinTimestamp === undefined) return ['unpin'];
  return ['pin'];
}

export function isAuditLog(log: discord.AuditLogEntry, key: string) {
  return false;
  return log instanceof discord.AuditLogEntry;
}

export const messages = {
  pin: async function(
    log: discord.AuditLogEntry.MessagePin,
    ev: discord.Event.IChannelPinsUpdate
  ) {
    if (!(log instanceof discord.AuditLogEntry.MessagePin)) return;
    let _usr = await discord.getUser(log.targetId);
    let mp = new Map([
      ['_TYPE_', 'MESSAGE_PINNED'],
      ['_CHANNEL_ID_', ev.channelId],
      ['_MESSAGE_ID_', log.options.messageId]
    ]);
    mp.set('_USERTAG_', '');
    if (_usr !== null) mp.set('_USERTAG_', getUserTag(_usr));
    return mp;
  },
  unpin: async function(
    log: discord.AuditLogEntry.MessageUnpin,
    ev: discord.Event.IChannelPinsUpdate
  ) {
    if (!(log instanceof discord.AuditLogEntry.MessageUnpin)) return;
    let _usr = await discord.getUser(log.targetId);
    let mp = new Map([
      ['_TYPE_', 'MESSAGE_UNPINNED'],
      ['_CHANNEL_ID_', ev.channelId],
      ['_MESSAGE_ID_', log.options.messageId]
    ]);
    mp.set('_USERTAG_', '');
    if (_usr !== null) mp.set('_USERTAG_', getUserTag(_usr));
    return mp;
  }
};

export async function AL_OnChannelPinsUpdate(
  id: string,
  guildId: string,
  log: any,
  ev: discord.Event.IChannelPinsUpdate
) {
  //console.log('onpins', ev, log);
  await handleEvent(id, guildId, discord.Event.CHANNEL_PINS_UPDATE, log, ev);
}
