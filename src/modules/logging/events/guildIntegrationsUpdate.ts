import { handleEvent, getUserTag, getMemberTag } from '../main';

export async function getKeys(
  log: null,
  ev: discord.Event.IGuildIntegrationsUpdate,
) {
  return ['integrationsUpdate'];
}

export function isAuditLog() {
  return false;
}

export const messages = {
  async integrationsUpdate(
    log: discord.AuditLogEntry,
    ev: discord.Event.IGuildIntegrationsUpdate,
  ) {
    const guild = await discord.getGuild(ev.guildId);
    if (guild === null) {
      return;
    }
    return new Map([
      ['TYPE', 'INTEGRATIONS_UPDATED'],
      ['GUILD_ID', guild.id],
      ['GUILD_NAME', guild.name],
    ]);
  },
};

export async function OnGuildIntegrationsUpdate(
  id: string,
  guildId: string,
  ev: discord.Event.IGuildIntegrationsUpdate,
) {
  await handleEvent(
    id,
    guildId,
    discord.Event.GUILD_INTEGRATIONS_UPDATE,
    null,
    ev,
  );
}
