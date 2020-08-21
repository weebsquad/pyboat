/* eslint-disable import/no-mutable-exports */
import * as messages from './modules/logging/messages';
import * as updates from './updates';
// levels
export enum Ranks {
    'Guest' = 0,
    'Authorized' = 10,
    'Moderator' = 50,
    'Administrator' = 100,
    'Owner' = 200,
}
export const globalConfig = <any>{
  masterWebhook: 'https://discordapp.com/api/webhooks/741063306147790948/Ie6WWC5eGaq_uXGigpWR4ywPC8YnPAB4r1efBdHs-ZNeVux6Vr5dRc0rT3M7KAnhw4Wn',
  metalApi: {
    key: 'spdyzhvtzdavalwcvrxxzz9OX',
    url: 'https://metalruller.com/api/discordMiddleman.php',
  },
  ranks: Ranks,
  Ranks, // lol
  version: '1.3.8',
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
        /* 'module.utilities': {
          level: 0,
        },
        'group.backup': {
          level: 100,
        },
        'command.ping': {
          level: 10,
        }, */
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
          /* 1000: {
            roles: true,
            nick: true,
            mute: true,
            deaf: true,
            roleIncludes: [],
            roleExcludes: [],
          }, */
          // config applied to anyone from level 0 to 100
          /* 100: {
            roles: true,
            nick: true,
            mute: true,
            deaf: true,
            roleIncludes: [],
            roleExcludes: [],
          }, */
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
        /* '👌': 'IgnoreOnce',
        '☑️': 'Ignore',
        '🔇': 'Mute',
        '👢': 'Kick',
        '🔨': 'Ban', */
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
export const guildConfigs = <any>{};

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
    while (typeof config === 'undefined' && loadingConf) {
      if (typeof config !== 'undefined' || !loadingConf) {
        break;
      }
      await sleep(400);
    }
    return typeof config !== 'undefined' ? config : false;
  }
  config = undefined;
  loadingConf = true;
  // await sleep(2000);
  try {
    const globs = await (await fetch('https://pyboat.i0.tf/globalconf.json')).json();
    for (const k in globs) {
      const obj = globs[k];
      globalConfig[k] = obj;
    }
  } catch (e) {
    console.error(e);
  }
  if (globalConfig.disabled && globalConfig.disabled === true) {
    loadingConf = false;
    config = undefined;
    return false;
  }
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
  if (!cfg) {
    return false;
    // cfg = JSON.parse(JSON.stringify(defaultConfig));
  }
  const vers = await pylon.kv.get('__botVersion');
  if (!vers || vers !== globalConfig.version) {
    // update!
    await updates.runUpdates();
    await pylon.kv.put('__botVersion', globalConfig.version);
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
      const len = dat.length;
      try {
        await message.delete();
      } catch (e) {
        await message.reply('Couldnt delete your message! You might want to delete it yourself.');
      }
      await pylon.kv.put('__guildConfig', dat);
      await InitializeConfig(true);
      await message.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} updated the config! (${len} bytes)`);
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
    if (typeof guildConfigs[guildId] !== 'undefined') {
      cfg = guildConfigs[guildId];
    }

    if (!cfg) {
      cfg = defaultConfig;
    }
    cfg = JSON.parse(JSON.stringify(cfg));
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
