export const eventFunctionPrefixAuditLog = 'AL_';
export const eventFunctionQueue = 'OnBatchEvents';
export const eventFunctionVarForceIndividuals = '_ForceIndividualEvents';
export const eventFunctionEveryEvent = 'OnAnyEvent';

export const eventFunctions = <any>{
  CHANNEL_CREATE: 'OnChannelCreate',
  CHANNEL_DELETE: 'OnChannelDelete',
  CHANNEL_UPDATE: 'OnChannelUpdate',
  CHANNEL_PINS_UPDATE: 'OnChannelPinsUpdate',
  GUILD_CREATE: 'OnGuildCreate',
  GUILD_BAN_ADD: 'OnGuildBanAdd',
  GUILD_BAN_REMOVE: 'OnGuildBanRemove',
  GUILD_EMOJIS_UPDATE: 'OnGuildEmojisUpdate',
  GUILD_INTEGRATIONS_UPDATE: 'OnGuildIntegrationsUpdate',
  GUILD_MEMBER_ADD: 'OnGuildMemberAdd',
  GUILD_MEMBER_REMOVE: 'OnGuildMemberRemove',
  GUILD_MEMBER_UPDATE: 'OnGuildMemberUpdate',
  GUILD_ROLE_CREATE: 'OnGuildRoleCreate',
  GUILD_ROLE_UPDATE: 'OnGuildRoleUpdate',
  GUILD_ROLE_DELETE: 'OnGuildRoleDelete',
  GUILD_UPDATE: 'OnGuildUpdate',
  MESSAGE_CREATE: 'OnMessageCreate',
  MESSAGE_DELETE: 'OnMessageDelete',
  MESSAGE_DELETE_BULK: 'OnMessageDeleteBulk',
  MESSAGE_REACTION_ADD: 'OnMessageReactionAdd',
  MESSAGE_REACTION_REMOVE: 'OnMessageReactionRemove',
  MESSAGE_REACTION_REMOVE_ALL: 'OnMessageReactionRemoveAll',
  MESSAGE_UPDATE: 'OnMessageUpdate',
  TYPING_START: 'OnTypingStart',
  VOICE_STATE_UPDATE: 'OnVoiceStateUpdate',
  VOICE_SERVER_UPDATE: 'OnVoiceServerUpdate',
  WEBHOOKS_UPDATE: 'OnWebhooksUpdate',
  USER_UPDATE: 'OnUserUpdate'
};

/*
  AL_OnGuildUpdate
*/
