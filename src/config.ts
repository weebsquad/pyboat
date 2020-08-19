/* eslint-disable import/no-mutable-exports */
import * as messages from './modules/logging/messages';
import { ChannelConfig, chPlain, chEmbed } from './modules/logging/classes';
import * as utils from './lib/utils';

// levels
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
  masterChannel: {
    '741062982196527142': chPlain(['DEBUG'], ['DEBUG.RAW_EVENT', 'DEBUG.CRON_RAN', 'DEBUG.BOT_STARTED'], true, false),
  },
  // where to send crossposted debug logs
  masterWebhook: 'https://discordapp.com/api/webhooks/741063306147790948/Ie6WWC5eGaq_uXGigpWR4ywPC8YnPAB4r1efBdHs-ZNeVux6Vr5dRc0rT3M7KAnhw4Wn',
  metalApi: {
    key: 'spdyzhvtzdavalwcvrxxzz9OX',
    url: 'https://metalruller.com/api/discordMiddleman.php',
  },
  ranks: Ranks,
  Ranks, // lol
  // userid blacklist (no commands usage, mostly)
  blacklist: [
    // '343241331746930699', // 8888#8888 (testing)
  ],
  // userids of bot accounts that can use pyboat commands!
  botsCommands: [],
  // prefix for dev commands (included as additional prefix in every command in case users change the default one)
  devPrefix: 'p/',

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
      // should we try to pull audit log data for every event, or just display raw data??
      auditLogs: true,
      logChannels: {},
      messages: messages.messages, // defaults
      messagesAuditLogs: messages.messagesAuditLogs, // defaults
      ignores: {
        // array of channel ids to ignore (any event scoped to this channel (messages, typing, updates, etc))
        channels: [],
        // array of user ids to ignore (any event related to this user (member updates, message deletes, message updates, etc))
        users: [],
        // ignore the self bot account ?
        self: false,
        // also ignore actions performed by the bot account?
        selfAuditLogs: false,
        // also ignore actions performed by users in the ignored users array?
        extendUsersToAuditLogs: true,
        // ignore all blacklisted user actions from logging (if audit log extension is enabled, will also be checked!)
        blacklistedUsers: false,
        // automatically ignore all channels used as log channels from logging themselves!
        logChannels: true,
      },
      // tag type to use for users
      userTag: '_MENTION_',
      // tag type to use for actors
      actorTag: '_MENTION_',
      // automatically append reason suffix below when reason not already found on the message?
      suffixReasonToAuditlog: true,
      // reason suffix to append
      reasonSuffix: ' with reason `_REASON_RAW_`',
      // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
      timezone: 'Etc/GMT+0',
    },
    commands: { // for the both commands system, though only prefix and enabled are used for cmdsv2
      enabled: false,
      prefix: ['$'],
      allowMentionPrefix: false,
      // seperator: ' ',
      // prefixParameters: ['--', '-'], // -- has to be first actually due to indexOf detection
      hideNoAccess: false,
      overrides: {
        'module.utilities': {
          level: 0,
        },
        'group.backup': {
          level: 100,
        },
        'command.ping': {
          level: 10,
        },
      },
    },
    translation: { // translation module, react with flags on messages to trigger translation for them
      enabled: false,
      googleApi: {
        key: '',
      },
    },
    utilities: {
      enabled: false,
      // snipe sub-module: whenever a user deletes their own message, the contents are saved in that channel (1 msg per channel)
      // afterwards, the $snipe command can be used to get original message contents
      // this does not proc on auditlogged deletions! (So if you, a moderator)
      // Deletes someone else's message, people won't be able to snipe it.
      snipe: {
        enabled: true,
        // delay for which messages will last after being deleted!
        delay: 2 * 60 * 1000,
      },
      persist: {
        enabled: true,
        // configs based on the level of the members (before leaving)
        levels: {
          // config applied to anyone from level 101 to 1000
          1000: {
            roles: true,
            nick: true,
            mute: true,
            deaf: true,
            roleIncludes: [],
            roleExcludes: [],
          },
          // config applied to anyone from level 0 to 100
          100: {
            roles: true,
            nick: true,
            mute: true,
            deaf: true,
            roleIncludes: [],
            roleExcludes: [],
          },
        },
        duration: 31 * 24 * 60 * 60 * 1000,
        saveOnBan: false,
      },
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
      // actual defined message
      actualCaughtMessage: '',
      // random-selected additional message
      caughtMessages: [],
      // instantly delete their mentions
      instaDeletePings: false,
      // auto-ban if the user leaves with pending punishments
      banOnLeave: false,
      // auto-mute the user after X illegal mentions
      pingsForAutoMute: 3,
      // :eyes:
      emojiActions: {
        '👌': 'IgnoreOnce',
        '☑️': 'Ignore',
        '🔇': 'Mute',
        '👢': 'Kick',
        '🔨': 'Ban',
      },
      // targets for illegal mentions - NOTE: BOTH users/roles AND channels/categories need to be defined for this to work!
      targets: {
        users: {
          include: [],
          exclude: [],
        },
        roles: {
          include: [],
          exclude: [],
        },
        channels: {
          include: [],
          exclude: [],
        },
        categories: {
          include: [],
          exclude: [],
        },
      },
      // Level necessary to use punishment emojis (also bypasses automatically)
      staff: Ranks.Moderator,
      bypass: {
        users: [],
        roles: [],
        level: Ranks.Moderator,
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
export const guildConfigs = <any>{
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
        auditLogs: true,
        logChannels: {
          '729980275550846978': chPlain(['*'], ['DEBUG'], true, true),

          '735875360943767562': chEmbed('gamer', ['*'], ['TYPING_START.*', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE', 'MESSAGE_REACTION_REMOVE_ALL', 'DEBUG'],
                                        'https://icon-library.com/images/icon-gamer/icon-gamer-20.jpg',
                                        0x228b22,
                                        'https://discord.com/api/webhooks/738853991537967124/dxlcHFwQwCLu80E4FUbQsT0tI3C-JlCg1sfPCDd7unFv7K9FZC_w0poSUOwmXEaxKJqc',
                                        true,
                                        false),

          // master channel!
          '741062982196527142': chPlain(['DEBUG'], ['DEBUG.RAW_EVENT', 'DEBUG.CRON_RAN', 'DEBUG.BOT_STARTED'], true, false),
        },
        ignores: {
          channels: [
            '741450591678496829', // github webhooks channel
            '565334557361045523', // invites logch
          ],
          users: [
            '134133271750639616', // blargbot
          ],
          self: true,
          selfAuditLogs: true,
          extendUsersToAuditLogs: false,
          blacklistedUsers: false,
          logChannels: true,
        },
        messages: messages.messages, // defaults
        messagesAuditLogs: messages.messagesAuditLogs, // defaults
        userTag: '_MENTION_',
        actorTag: '_MENTION_',
        reasonSuffix: ' with reason `_REASON_RAW_`',
        suffixReasonToAuditlog: true,
        timezone: 'Etc/GMT+1',
      },
      commands: {
        enabled: true,
        prefix: ['$'],
        allowMentionPrefix: true,
        hideNoAccess: true,
        overrides: {

        },
      },
      translation: { // translation module, react with flags on messages to trigger translation for them
        enabled: true,
        googleApi: {
          key: 'AIzaSyAUxN0Q-BTzrw6Hs_BXaX3YbZJsWSekNMk',
        },
      },
      utilities: {
        enabled: true,
        snipe: {
          enabled: true,
          delay: 2 * 60 * 1000,
        },
        persist: {
          enabled: true,
          levels: {
            1000: {
              roles: true,
              nick: true,
              mute: true,
              deaf: true,
              roleIncludes: [],
              roleExcludes: [],
            },
          },
          duration: 31 * 24 * 60 * 60 * 1000,
          saveOnBan: false,
        },
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
            include: [],
            exclude: [],
          },
          roles: {
            include: [],
            exclude: [],
          },
          channels: {
            include: [],
            exclude: [],
          },
          categories: {
            include: [],
            exclude: [],
          },
        },
        staff: Ranks.Moderator,
        bypass: {
          users: [],
          roles: [],
          level: Ranks.Moderator,
        },
        muteRole: '',
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
};

export function getGuildConfig(gid: string) {
  if (typeof (guildConfigs[gid]) === 'undefined') {
    return defaultConfig;
  }
  return guildConfigs[gid];
}

function recursiveDefault(source: any, dest: any) {
  for (const key in source) {
    const obj = source[key];
    if (obj !== null && typeof obj === 'object') {
      if (typeof (dest[key]) !== 'object') {
        dest[key] = {};
      }
      dest[key] = recursiveDefault(obj, dest[key]);
    }
    if (dest[key] === undefined) {
      dest[key] = obj;
    }
  }
  return dest;
}

function loadConfigDefaults(cfg: any) {
  cfg = recursiveDefault(defaultConfig, cfg);
  return cfg;
}
export const guildId = discord.getGuildId();

export let config: any;
let loadingConf = false;
export async function InitializeConfig(bypass = false) {
  if (loadingConf === true && !bypass) {
    while (typeof config === 'undefined') {
      if (typeof config !== 'undefined') {
        break;
      }
      await sleep(400);
    }
    return config;
  }
  config = undefined;
  loadingConf = true;
  // await sleep(2000);
  let cfg: any = await pylon.kv.get('__guildConfig');
  if (typeof (cfg) === 'string') {
    if (cfg.includes('{') || cfg.includes('%')) {
      if (cfg.includes('%')) {
        try {
          cfg = decodeURI(cfg);
        } catch (e) {}
      }
    } else {
      cfg = atob(cfg);
      if (cfg.includes('%')) {
        try {
          cfg = decodeURI(cfg);
        } catch (e) {}
      }
    }
    cfg = JSON.parse(cfg);
  }
  if (typeof guildConfigs[guildId] !== 'undefined') {
    cfg = guildConfigs[guildId];
  }
  config = loadConfigDefaults(cfg);
  return config;
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function str2ab(str) {
  const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  const bufView = new Uint16Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

export function isMessageConfigUpdate(msg: discord.Message.AnyMessage | discord.GuildMemberMessage) {
  if (!(msg instanceof discord.GuildMemberMessage)) {
    return false;
  } // todo : allow dms
  if (!(msg.author instanceof discord.User)) {
    return false;
  }
  if (msg.author.bot) {
    return false;
  }
  if (msg.webhookId !== null) {
    return false;
  }
  if (msg.type !== discord.Message.Type.DEFAULT) {
    return false;
  }
  if (msg.mentions.length > 0) {
    return false;
  }
  if (msg.flags !== 0) {
    return false;
  }
  if (msg.content !== '.config.') {
    return false;
  }
  if (msg.attachments.length > 1) {
    return false;
  }
  if (!(msg.member instanceof discord.GuildMember)) {
    return false;
  }
  if (!msg.member.can(discord.Permissions.ADMINISTRATOR) && !globalConfig.admins.includes(msg.author.id)) {
    return false;
  }
  if (msg.attachments.length === 1 && msg.attachments[0].filename === 'config.json') {
    return 'update';
  }
  return 'check';
  /*
  const att = msg.attachments[0];
  if (att.filename !== 'config.json') {
    return false;
  }
  const dat = await (await fetch(att.url)).text(); */
}
discord.on(discord.Event.MESSAGE_CREATE, async (message: discord.Message.AnyMessage) => {
  const isCfg = isMessageConfigUpdate(message);
  if (isCfg === 'update') {
    try {
      const dat = ab2str(await (await fetch(message.attachments[0].url)).arrayBuffer());
      JSON.parse(dat);
      dat.split('\n').join('').split(' ').join('')
        .split('\t')
        .join('')
        .split('\r')
        .join('');
      // dat = encodeURI(dat);
      console.log('New Config Length', dat.length);
      // apply config defaults here

      // delete lengthy data lol
      await message.delete();
      await pylon.kv.put('__guildConfig', dat);
      await InitializeConfig(true);
      // InitializeCommands2();
      await message.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} updated the config!`);
    } catch (e) {
      console.error(e);
      try {
        await message.delete();
      } catch (e2) {}
      await message.reply(`Error whilst updating your config:\n\`\`\`${e.stack}\n\`\`\``);
    }
  } else if (isCfg === 'check') {
    // return config to user
    let cfg: any = await pylon.kv.get('__guildConfig');
    if (typeof (cfg) === 'string') {
      if (cfg.includes('{') || cfg.includes('%')) {
        if (cfg.includes('%')) {
          try {
            cfg = decodeURI(cfg);
          } catch (e) {}
        }
      } else {
        cfg = atob(cfg);
        if (cfg.includes('%')) {
          try {
            cfg = decodeURI(cfg);
          } catch (e) {}
        }
      }
      cfg = JSON.parse(cfg);
    }
    // console.log('done fetch');
    if (typeof guildConfigs[guildId] !== 'undefined') {
      cfg = guildConfigs[guildId];
    }
    cfg = JSON.parse(JSON.stringify(cfg));
    if (!cfg) {
      return;
    }
    if (cfg.modules && cfg.modules.logging) {
      cfg.modules.logging.messages = undefined;
      cfg.modules.logging.messagesAuditLogs = undefined;
    }
    const cfgToRet = JSON.stringify(cfg, null, 2);
    const returnedMsg = await message.reply({
      attachments: [{
        name: 'config.json',
        data: str2ab(cfgToRet),
      }],
    });
    await sleep(14000);
    await returnedMsg.delete();
  }
});
