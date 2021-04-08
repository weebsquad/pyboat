export const MAX_KV_SIZE = 7900;
export const discordEventsMap: {[key: string]: any} = {
  CHANNEL_CREATE: discord.Event.CHANNEL_CREATE,
  CHANNEL_DELETE: discord.Event.CHANNEL_DELETE,
  CHANNEL_UPDATE: discord.Event.CHANNEL_UPDATE,
  CHANNEL_PINS_UPDATE: discord.Event.CHANNEL_PINS_UPDATE,
  GUILD_CREATE: discord.Event.GUILD_CREATE,
  GUILD_BAN_ADD: discord.Event.GUILD_BAN_ADD,
  GUILD_BAN_REMOVE: discord.Event.GUILD_BAN_REMOVE,
  GUILD_EMOJIS_UPDATE: discord.Event.GUILD_EMOJIS_UPDATE,
  GUILD_INTEGRATIONS_UPDATE: discord.Event.GUILD_INTEGRATIONS_UPDATE,
  GUILD_MEMBER_ADD: discord.Event.GUILD_MEMBER_ADD,
  GUILD_MEMBER_REMOVE: discord.Event.GUILD_MEMBER_REMOVE,
  GUILD_MEMBER_UPDATE: discord.Event.GUILD_MEMBER_UPDATE,
  GUILD_ROLE_CREATE: discord.Event.GUILD_ROLE_CREATE,
  GUILD_ROLE_UPDATE: discord.Event.GUILD_ROLE_UPDATE,
  GUILD_ROLE_DELETE: discord.Event.GUILD_ROLE_DELETE,
  GUILD_UPDATE: discord.Event.GUILD_UPDATE,
  MESSAGE_CREATE: discord.Event.MESSAGE_CREATE,
  MESSAGE_DELETE: discord.Event.MESSAGE_DELETE,
  MESSAGE_DELETE_BULK: discord.Event.MESSAGE_DELETE_BULK,
  MESSAGE_REACTION_ADD: discord.Event.MESSAGE_REACTION_ADD,
  MESSAGE_REACTION_REMOVE: discord.Event.MESSAGE_REACTION_REMOVE,
  MESSAGE_REACTION_REMOVE_ALL: discord.Event.MESSAGE_REACTION_REMOVE_ALL,
  MESSAGE_UPDATE: discord.Event.MESSAGE_UPDATE,
  VOICE_STATE_UPDATE: discord.Event.VOICE_STATE_UPDATE,
  VOICE_SERVER_UPDATE: discord.Event.VOICE_SERVER_UPDATE,
  TYPING_START: discord.Event.TYPING_START,
  WEBHOOKS_UPDATE: discord.Event.WEBHOOKS_UPDATE,
  USER_UPDATE: discord.Event.USER_UPDATE,
};

export const channelTypeMap = new Map<discord.Channel.Type, string>();
channelTypeMap.set(discord.Channel.Type.DM, 'Direct Message');
channelTypeMap.set(discord.Channel.Type.GUILD_TEXT, 'Text');
channelTypeMap.set(discord.Channel.Type.GUILD_VOICE, 'Voice');
channelTypeMap.set(discord.Channel.Type.GUILD_STAGE_VOICE, 'Stage');
channelTypeMap.set(discord.Channel.Type.GUILD_CATEGORY, 'Category');
channelTypeMap.set(discord.Channel.Type.GUILD_NEWS, 'News');
channelTypeMap.set(discord.Channel.Type.GUILD_STORE, 'Store');
