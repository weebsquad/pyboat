import * as messages from './modules/logging/messages';
import { GuildConfig, ChannelConfig, chPlain, chEmbed } from './modules/logging/classes';
import { getUserEntitlements } from './lib/utils';

export enum Ranks {
    'Guest' = 0,
    'Authorized' = 10,
    'Moderator' = 50,
    'Administrator' = 100,
    'Owner' = 200,
}

export const globalConfig = <any>{
  // Global Admin
  admins: [
    '344837487526412300', // metal#0666
  ],
  // used for logging debugging mostly
  masterGuild: '565323632751149103',
  // where to send crossposted debug logs
  masterWebhook: 'https://discordapp.com/api/webhooks/741063306147790948/Ie6WWC5eGaq_uXGigpWR4ywPC8YnPAB4r1efBdHs-ZNeVux6Vr5dRc0rT3M7KAnhw4Wn',
  metalApi: {
    key: 'spdyzhvtzdavalwcvrxxzz9OX',
    url: 'https://metalruller.com/api/discordMiddleman.php',
  },
  ranks: Ranks,
  // userid blacklist (no commands usage, mostly)
  blacklist: [
    '343241331746930699', // 8888#8888 (testing)
  ],
  // userids of bot accounts that can use pyboat commands!
  botsCommands: [],
};
const defaultConfig = { // for non-defined configs!
  levels: {
    users: {},
    roles: {},
  },
  modules: {
    queue: false,
    logging: { // event logging module
      enabled: false,
      logChannels: new Map<discord.Snowflake, ChannelConfig>(),
      messages: messages.messages, // defaults
      messagesAuditLogs: messages.messagesAuditLogs, // defaults
      ignores: {
        channels: [],
        users: [],
        self: true,
        extendUsersToAuditLogs: true,
        selfAuditLogs: false,
        logChannels: true,
      },
      userTag: '',
      actorTag: '',
      reasonPrefix: '',
      suffixReasonToAuditlog: false,
    },
    commands: { // for the both commands system, though only prefix and enabled are used for cmdsv2
      enabled: false,
      prefix: ['$'],
      allowMentionPrefix: false,
      seperator: ' ',
      prefixParameters: ['--', '-'], // -- has to be first actually due to indexOf detection
    },
    translation: { // translation module, react with flags on messages to trigger translation for them
      enabled: false,
      googleApi: {
        key: '',
      },
    },
    utilities: { // todo
      enabled: false,
    },
    roleManagement: { // for group srv only
      enabled: false,
      lowestHoistRole: '',
      botRoleRP: '',
      botRole: '',
      memberRole: '',
      memberRoleRP: '',
    },
    antiPing: { // owo
      enabled: false,
      logChannel: '',
      actualCaughtMessage: '',
      caughtMessages: [],
      instaDeletePings: false,
      banOnLeave: false,
      pingsForAutoMute: 3,
      emojiActions: {
        '👌': 'IgnoreOnce',
        '☑️': 'Ignore',
        '🔇': 'Mute',
        '👢': 'Kick',
        '🔨': 'Ban',
      },
      targets: {
        users: {
          whitelist: [],
          blacklist: [],
        },
        roles: {
          whitelist: [],
          blacklist: [],
        },
        channels: {
          whitelist: [],
          blacklist: [],
        },
        categories: {
          whitelist: [],
          blacklist: [],
        },
      },
      staff: [],
      bypass: {
        users: [],
        roles: [],
      },
      muteRole: '',
    },
    counting: { // counting module
      enabled: false,
      channels: [],
      keyCount: 'counting_current',
      keyLastUser: 'counting_lastuser',
      keyLastMid: 'counting_lastmid',
      autoPins: {
        single: [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999], // Individual === check
        repeating: [1000], // Modulus check
        repeatingLast: [69], // Everytime these digits are found on last X of current number, it will trigger
      },
      useWebhook: false,
      webhook: '',
    },
  },
};
const guildConfigs = <any>{
  '565323632751149103': { // pink
    levels: {
      users: {
        '344837487526412300': 1337, // Metal
        '545581357812678656': 200, // megu
        '248137443184738305': 200, // matt
        '128425121969864704': 200, // chom
        '135856734542495744': 100, // mage
        '187026807919345664': 100, // d1nzy
        '162160695868129280': 100, // luke
      },
      roles: {
        '576416312142725131': 200, // dot role
        '565325264981327873': 200, // op role
        '567988684193005568': 100, // admin role
        '565338597755060225': 10, // member role
      },
    },
    modules: {
      queue: true, // eventhandler auto queueing on ratelimits
      logging: { // event logging module
        enabled: true,
        debug: true,
        logChannels: new Map<discord.Snowflake, ChannelConfig>([
          ['729980275550846978', chPlain(['*'], ['DEBUG'], true, true)],
          [
            '735875360943767562', chEmbed('gamer', ['*'], ['TYPING_START.*', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE', 'MESSAGE_REACTION_REMOVE_ALL', 'DEBUG'],
                                          'https://icon-library.com/images/icon-gamer/icon-gamer-20.jpg',
                                          'https://discord.com/api/webhooks/738853991537967124/dxlcHFwQwCLu80E4FUbQsT0tI3C-JlCg1sfPCDd7unFv7K9FZC_w0poSUOwmXEaxKJqc',
                                          true,
                                          false),
          ],
          // master channel!
          ['741062982196527142', chPlain(['DEBUG'], ['DEBUG.RAW_EVENT', 'DEBUG.CRON_RAN', 'DEBUG.BOT_STARTED'], true, false)],
        ]),
        ignores: {
          channels: [],
          users: [],
          self: true,
          extendUsersToAuditLogs: true,
          selfAuditLogs: true,
          logChannels: true,
        },
        messages: messages.messages, // defaults
        messagesAuditLogs: messages.messagesAuditLogs, // defaults
        userTag: '_MENTION_',
        actorTag: '_MENTION_',
        reasonPrefix: ' with reason `_REASON_RAW_`',
        suffixReasonToAuditlog: true,
      },
      commands: { // for the both commands system, though only prefix and enabled are used for cmdsv2
        enabled: true,
        prefix: ['$'],
        allowMentionPrefix: true,
        seperator: ' ',
        prefixParameters: ['--', '-'], // -- has to be first actually due to indexOf detection
      },
      translation: { // translation module, react with flags on messages to trigger translation for them
        enabled: true,
        googleApi: {
          key: 'AIzaSyAUxN0Q-BTzrw6Hs_BXaX3YbZJsWSekNMk',
        },
      },
      utilities: { // todo
        enabled: true,
      },
      roleManagement: { // for group srv only
        enabled: true,
        lowestHoistRole: '666575421281927218',
        botRoleRP: '700009450760568932',
        botRole: '565335659066294272',
        memberRole: '565338597755060225',
        memberRoleRP: '575239761149558785',
      },
      antiPing: { // owo
        enabled: false,
        logChannel: '729980275550846978',
        actualCaughtMessage: 'no pings',
        caughtMessages: ['ok buddy', 'nonoononoon', 'bad'],
        instaDeletePings: false,
        banOnLeave: false,
        pingsForAutoMute: 3,
        emojiActions: {
          '👌': 'IgnoreOnce',
          '☑️': 'Ignore',
          '🔇': 'Mute',
          '👢': 'Kick',
          '🔨': 'Ban',
        },
        targets: {
          users: {
            whitelist: [],
            blacklist: [],
          },
          roles: {
            whitelist: ['565482292303101953'],
            blacklist: [],
          },
          channels: {
            whitelist: ['565333823869550592'],
            blacklist: [],
          },
          categories: {
            whitelist: [],
            blacklist: [],
          },
        },
        staff: ['567988684193005568'],
        bypass: {
          users: [],
          roles: ['596738480391061505'],
        },
        muteRole: '576330934010511361',
      },
      counting: { // counting module
        enabled: true,
        channels: ['703167521431355412'],
        keyCount: 'counting_current',
        keyLastUser: 'counting_lastuser',
        keyLastMid: 'counting_lastmid',
        autoPins: {
          single: [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999], // Individual === check
          repeating: [1000], // Modulus check
          repeatingLast: [69], // Everytime these digits are found on last X of current number, it will trigger
        },
        useWebhook: false,
        webhook: '',
      },
    },
  },

  '307927177154789386': { // metals test srv
    levels: {
      users: {
        '344837487526412300': 1337, // Metal
        '343241331746930699': 100, // metals alt
      },
      roles: {
        '691950782949490698': 50, // admin role
      },
    },
    modules: {
      queue: true, // eventhandler auto queueing on ratelimits
      logging: { // event logging module
        enabled: true,
        debug: true,
        logChannels: new Map<discord.Snowflake, ChannelConfig>([
          ['740997800749170698', chPlain(['*'], [], true, true)],
          // ['735780975145123901', chPlain(['DEBUG'], ['DEBUG.RAW_EVENT', 'DEBUG.CRON_RAN', 'DEBUG.BOT_STARTED'], true, true)],
        ]),
        ignores: {
          channels: [],
          users: [],
          self: true,
          extendUsersToAuditLogs: true,
          selfAuditLogs: false,
          logChannels: true,
        },
        messages: messages.messages, // defaults
        messagesAuditLogs: messages.messagesAuditLogs, // defaults
        userTag: '_MENTION_',
        actorTag: '_MENTION_',
        reasonPrefix: ' with reason `_REASON_RAW_`',
        suffixReasonToAuditlog: true,
      },
      commands: { // for the both commands system, though only prefix and enabled are used for cmdsv2
        enabled: true,
        prefix: ['$'],
        allowMentionPrefix: true,
        seperator: ' ',
        prefixParameters: ['--', '-'], // -- has to be first actually due to indexOf detection
      },
      translation: { // translation module, react with flags on messages to trigger translation for them
        enabled: true,
        googleApi: {
          key: 'AIzaSyAUxN0Q-BTzrw6Hs_BXaX3YbZJsWSekNMk',
        },
      },
      utilities: { // todo
        enabled: false,
      },
      roleManagement: { // for group srv only
        enabled: false,
        lowestHoistRole: '666575421281927218',
        botRoleRP: '700009450760568932',
        botRole: '565335659066294272',
        memberRole: '565338597755060225',
        memberRoleRP: '575239761149558785',
      },
      antiPing: { // owo
        enabled: false,
        logChannel: '729980275550846978',
        actualCaughtMessage: 'no pings',
        caughtMessages: ['ok buddy', 'nonoononoon', 'bad'],
        instaDeletePings: false,
        banOnLeave: false,
        pingsForAutoMute: 3,
        emojiActions: {
          '👌': 'IgnoreOnce',
          '☑️': 'Ignore',
          '🔇': 'Mute',
          '👢': 'Kick',
          '🔨': 'Ban',
        },
        targets: {
          users: {
            whitelist: [],
            blacklist: [],
          },
          roles: {
            whitelist: ['565482292303101953'],
            blacklist: [],
          },
          channels: {
            whitelist: ['565333823869550592'],
            blacklist: [],
          },
          categories: {
            whitelist: [],
            blacklist: [],
          },
        },
        staff: ['567988684193005568'],
        bypass: {
          users: [],
          roles: ['596738480391061505'],
        },
        muteRole: '576330934010511361',
      },
      counting: { // counting module
        enabled: false,
        channels: ['740880532325531659'],
        keyCount: 'counting_current',
        keyLastUser: 'counting_lastuser',
        keyLastMid: 'counting_lastmid',
        autoPins: {
          single: [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999], // Individual === check
          repeating: [1000], // Modulus check
          repeatingLast: [69], // Everytime these digits are found on last X of current number, it will trigger
        },
        useWebhook: false,
        webhook: '',
      },
    },
  },
};

export function getGuildConfig(gid: string) {
  if (typeof (guildConfigs[gid]) === 'undefined') {
    return defaultConfig;
  }
  return guildConfigs[gid];
}
export const guildId = discord.getGuildId();

export const config = getGuildConfig(guildId);
