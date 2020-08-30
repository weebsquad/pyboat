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
export const EmojiRegex = /<(a?):(.+):([0-9]+)>/gi;
export const InviteRegex = /(discordapp.com\/invite|discord.me|discord.gg)(?:\/#)?(?:\/invite)?\/([a-z0-9\-]+)/gi;
export const UrlRegex = /(https?:\/\/[^\s]+)/gi;
const ZALGO_CHARS = [
  '\u030d',
  '\u030e',
  '\u0304',
  '\u0305',
  '\u033f',
  '\u0311',
  '\u0306',
  '\u0310',
  '\u0352',
  '\u0357',
  '\u0351',
  '\u0307',
  '\u0308',
  '\u030a',
  '\u0342',
  '\u0343',
  '\u0344',
  '\u034a',
  '\u034b',
  '\u034c',
  '\u0303',
  '\u0302',
  '\u030c',
  '\u0350',
  '\u0300',
  '\u030b',
  '\u030f',
  '\u0312',
  '\u0313',
  '\u0314',
  '\u033d',
  '\u0309',
  '\u0363',
  '\u0364',
  '\u0365',
  '\u0366',
  '\u0367',
  '\u0368',
  '\u0369',
  '\u036a',
  '\u036b',
  '\u036c',
  '\u036d',
  '\u036e',
  '\u036f',
  '\u033e',
  '\u035b',
  '\u0346',
  '\u031a',
  '\u0315',
  '\u031b',
  '\u0340',
  '\u0341',
  '\u0358',
  '\u0321',
  '\u0322',
  '\u0327',
  '\u0328',
  '\u0334',
  '\u0335',
  '\u0336',
  '\u034f',
  '\u035c',
  '\u035d',
  '\u035e',
  '\u035f',
  '\u0360',
  '\u0362',
  '\u0338',
  '\u0337',
  '\u0361',
  '\u0489',
  '\u0316',
  '\u0317',
  '\u0318',
  '\u0319',
  '\u031c',
  '\u031d',
  '\u031e',
  '\u031f',
  '\u0320',
  '\u0324',
  '\u0325',
  '\u0326',
  '\u0329',
  '\u032a',
  '\u032b',
  '\u032c',
  '\u032d',
  '\u032e',
  '\u032f',
  '\u0330',
  '\u0331',
  '\u0332',
  '\u0333',
  '\u0339',
  '\u033a',
  '\u033b',
  '\u033c',
  '\u0345',
  '\u0347',
  '\u0348',
  '\u0349',
  '\u034d',
  '\u034e',
  '\u0353',
  '\u0354',
  '\u0355',
  '\u0356',
  '\u0359',
  '\u035a',
  '\u0323',
];
export const ZalgoRegex = new RegExp(ZALGO_CHARS.join('|'), 'gi');
export const AsciiRegex = /[\x00-\x08\x0E-\x1F\x7F-\uFFFF]/g;
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
