import { handleEvent, getUserTag, getMemberTag } from '../main';

export async function getKeys(log: null, ev: discord.Event.IWebhooksUpdate) {
  return ['webhooksUpdate'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  webhooksUpdate: async function(
    log: discord.AuditLogEntry,
    ev: discord.Event.IWebhooksUpdate
  ) {
    return new Map([
      ['_TYPE_', 'WEBHOOK_UPDATED'],
      ['_CHANNEL_ID_', ev.channelId]
    ]);
  }
};

export async function OnWebhooksUpdate(
  id: string,
  guildId: string,
  ev: discord.Event.IWebhooksUpdate
) {
  console.log('OnWebhooksUpdate', ev);
  await handleEvent(id, guildId, discord.Event.WEBHOOKS_UPDATE, null, ev);
}
