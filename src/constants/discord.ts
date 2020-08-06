export const EntitlementTypeEnum : {[key: string]: number} = {
  Purchase: 1, // entitlement was purchased
  PremiumSubscription: 2, // entitlement for a Discord Nitro subscription
  DeveloperGift: 3, // entitlement was gifted by a developer
  TestModePurchase: 4, // entitlement was purchased by a dev in application test mode
  FreePurchase: 5, // entitlement was granted when the SKU was free
  UserGift: 6, // entitlement was gifted by another user
  PremiumPurchase: 7, // entitlement was claimed by user for free as a Nitro Subscriber
};

export const Epoch = 1420070400000;
export const EmojiRegex = /<(a?):(.+):([0-9]+)>/;

export const PermissionFlags: {[key: string]: any} = {
  CREATE_INSTANT_INVITE: 1 << 0,
  KICK_MEMBERS: 1 << 1,
  BAN_MEMBERS: 1 << 2,
  ADMINISTRATOR: 1 << 3,
  MANAGE_CHANNELS: 1 << 4,
  MANAGE_GUILD: 1 << 5,
  ADD_REACTIONS: 1 << 6,
  VIEW_AUDIT_LOG: 1 << 7,
  PRIORITY_SPEAKER: 1 << 8,
  STREAM: 1 << 9,
  VIEW_CHANNEL: 1 << 10,
  SEND_MESSAGES: 1 << 11,
  SEND_TTS_MESSAGES: 1 << 12,
  MANAGE_MESSAGES: 1 << 13,
  EMBED_LINKS: 1 << 14,
  ATTACH_FILES: 1 << 15,
  READ_MESSAGE_HISTORY: 1 << 16,
  MENTION_EVERYONE: 1 << 17,
  USE_EXTERNAL_EMOJIS: 1 << 18,
  VIEW_GUILD_INSIGHTS: 1 << 19,
  CONNECT: 1 << 20,
  SPEAK: 1 << 21,
  MUTE_MEMBERS: 1 << 22,
  DEAFEN_MEMBERS: 1 << 23,
  MOVE_MEMBERS: 1 << 24,
  USE_VOICE_ACTIVITY: 1 << 25,
  CHANGE_NICKNAME: 1 << 26,
  MANAGE_NICKNAMES: 1 << 27,
  MANAGE_ROLES: 1 << 28,
  MANAGE_WEBHOOKS: 1 << 29,
  MANAGE_EMOJIS: 1 << 30,
  /* test31: BigInt(BigInt(1) << BigInt(31)),
      test32: BigInt(BigInt(1) << BigInt(32)),
      test33: BigInt(BigInt(1) << BigInt(33)),
      test34: BigInt(BigInt(1) << BigInt(34)),
      test35: BigInt(BigInt(1) << BigInt(35)),
      test36: BigInt(BigInt(1) << BigInt(36)),
      test37: BigInt(BigInt(1) << BigInt(37)) */
};
