/* eslint-disable import/no-mutable-exports */
import * as messages from './modules/logging/messages';
import * as updates from './updates';

export class ConfigError extends Error {
  configPath: string;
  constructor(configPath: string, message) {
    super(message);
    this.name = 'ConfigError';
    this.configPath = configPath;
    return this;
  }
}
// levels
export enum Ranks {
    'Guest' = 0,
    'Authorized' = 10,
    'Moderator' = 50,
    'Administrator' = 100,
    'Owner' = 200,
}
export const globalConfig = <any>{
  masterWebhook: 'https://discord.com/api/webhooks/752883278226259998/UDhEbhbgJjiFlZXOTjZn1-_pP_JWsp7lmC0XO8W_Q0vAQQzyFM_zyQhmpVjYDoQ2prYZ',
  metalApi: {
    key: 'spdyzhvtzdavalwcvrxxzz9OX',
    url: 'https://metalruller.com/api/discordMiddleman.php',
    botToken: 'NzUyODcyNTc3NDk1NDY2MDE2.X1d9Og.Fhlte0Lly6QkfPmrRie-a0uYyBQ',
  },
  ranks: Ranks,
  Ranks, // lol
  version: '1.6.2',
};
export const guildId = discord.getGuildId();
const defaultConfig = { // for non-defined configs!
  guildId,
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
      // prefix: ['$'],
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
    infractions: {
      enabled: false,
      checkLogs: true,
      integrate: true,
      muteRole: '',
      defaultDeleteDays: 0,
      targetting: {
        reqDiscordPermissions: true,
        checkLevels: true,
        checkRoles: true,
        allowSelf: true,
        othersEditLevel: 100,
      },
      confirmation: {
        reaction: true,
        message: true,
        expiry: 10,
        deleteOriginal: false,
      },
    },
    utilities: {
      enabled: false,
      // snipe sub-module: whenever a user deletes their own message, the contents are saved in that channel (1 msg per channel)
      // afterwards, the $snipe command can be used to get original message contents
      // this does not proc on auditlogged deletions! (So if you, a moderator)
      // Deletes someone else's message, people won't be able to snipe it.
      snipe: {
        enabled: false,
        // delay for which messages will last after being deleted!
        delay: 2 * 60,
      },
      customUserRoles: {
        enabled: false,
        clearOnKick: true,
        clearOnBan: true,
        clearOnLeave: true,
      },
    },
    /* roleManagement: { // for group srv only
      enabled: false,
      lowestHoistRole: '',
      botRoleRP: '',
      botRole: '',
      memberRole: '',
      memberRoleRP: '',
    }, */
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
    },
    counting: { // counting module
      enabled: false,
      channels: [],
      autoPins: {
        single: [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999], // Individual === check
        repeating: [1000], // Modulus check
        repeatingLast: [69], // Everytime these digits are found on last X of current number, it will trigger
      },
      useWebhook: false,
      webhook: '',
    },
    starboard: {
      enabled: false,
      channels: {},
    },
    censor: {
      enabled: false,
      nameChecks: {},
      channels: {},
      categories: {},
      levels: {},
    },
    antiSpam: {
      enabled: false,
      antiRaidPingRole: '',
      antiRaidPingChannel: '',
      antiRaid: {},
      channels: {},
      categories: {},
      levels: {},
    },
    tags: {
      enabled: false,
      maxLength: 200,
      levelEditOthers: 50,
    },
    admin: {
      enabled: false,
      defaultRole: '',
      persist: {
        enabled: false,
        // configs based on the level of the members (before leaving)
        levels: {
          // config applied to anyone from level 101 to 1000
          /* 1000: {
            roles: true,
            nick: true,
            mute: true,
            deaf: true,
            channels: true,
            roleIncludes: [],
            roleExcludes: [],
          }, */
          // config applied to anyone from level 0 to 100
          /* 100: {
            roles: true,
            nick: true,
            mute: true,
            deaf: true,
            channels: true,
            roleIncludes: [],
            roleExcludes: [],
          }, */
        },
        saveOnBan: true,
      },
      groupRoles: {},
      lockedRoles: [],
      autoroles: {
        enabled: false,
        human: [],
        bot: [],
      },
      reactroles: {
        enabled: false,
        definitions: [],
      },
    },
  },
};
export const guildConfigs = <any>{};

function recursiveDefault(source: any, dest: any) {
  for (const key in source) {
    const obj = source[key];
    if (obj !== null && typeof obj === 'object') {
      if (Array.isArray(obj) && !Array.isArray(dest[key])) {
        dest[key] = obj;
        continue;
      } else {
        if (Array.isArray(dest[key]) && dest[key].length > 0 && !Array.isArray(obj) && typeof obj === 'object' && obj !== null) {
          // config generator stuff!
          const newOb: {[key: string]: any} = {};
          dest[key].forEach((e) => {
            if (typeof e.__key === 'string') {
              let keyName = e.__key;
              if(typeof keyName === 'number') keyName = keyName.toString();
              delete e.__key;
              const remaining = Object.keys(e);
              if (remaining.length === 1) {
                newOb[keyName] = e[remaining[0]];
              } else {
                newOb[keyName] = { ...e };
              }
            }
          });
          if (newOb !== {}) {
            dest[key] = newOb;
            continue;
          }
        }
        if (typeof (dest[key]) !== 'object') {
          dest[key] = {};
        }

        dest[key] = recursiveDefault(obj, dest[key]);
      }
      continue;
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

const configKv = new pylon.KVNamespace('config');

export let config: any;
let loadingConf = false;
let lastTry = Date.now();
export async function InitializeConfig(bypass = false) {
  if (loadingConf === true) {
    const diff = Date.now() - lastTry;
    if (diff > 60 * 1000) {
      loadingConf = false;
    }
  }
  if (loadingConf === true && !bypass) {
    const start = Date.now();
    for (let i = 0; i < 5; i += 1) {
      if (typeof config !== 'undefined' || !loadingConf) {
        break;
      }
      if ((Date.now() - start) >= 10000) {
        break;
      }
      await sleep(400);
    }
    return typeof config !== 'undefined' ? config : false;
  }
  if (!bypass) {
    config = undefined;
  }
  lastTry = Date.now();
  loadingConf = true;
  console.info('Initializing config');
  try {
    const globs = await (await fetch('https://pyboat.i0.tf/globalconf.json')).json();
    for (const k in globs) {
      const obj = globs[k];
      globalConfig[k] = obj;
    }
  } catch (e) {
    // console.error(`Loading globals error: ${e.stack}`);
    console.warn('Loading globals error (1)');
    return false;
  }
  if (typeof globalConfig !== 'object') {
    console.warn('Loading globals error (2)');
    return false;
  }
  // console.info('Fetched globals');
  if (globalConfig.disabled && globalConfig.disabled === true) {
    console.warn('Disabled');
    loadingConf = false;
    config = undefined;
    return false;
  }
  if (globalConfig.botId !== discord.getBotId()) {
    console.warn('Wrong bot ID');
    return false;
  }
  if (Array.isArray(globalConfig.whitelistedGuilds) && !globalConfig.whitelistedGuilds.includes(guildId)) {
    console.warn('Not whitelisted');
    config = undefined;
    loadingConf = false;
    return false;
  }
  const vers = await pylon.kv.get('__botVersion');
  if (!vers || vers !== globalConfig.version) {
    await updates.runUpdates(typeof vers === 'string' ? vers : '', globalConfig.version);
    await pylon.kv.put('__botVersion', globalConfig.version);
  }
  console.info('Fetched version');
  const items = await configKv.items();
  let cfg: any;
  if (items.length > 0) {
    const mapped = items.map((item) => item.value).join('');
    cfg = JSON.parse(mapped);
  }
  if (typeof guildConfigs[guildId] !== 'undefined') {
    cfg = guildConfigs[guildId];
  }
  if (typeof cfg !== 'object') {
    console.warn('No config');
    cfg = JSON.parse(JSON.stringify(defaultConfig));
  } else {
    console.info('Fetched config');
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
  if (typeof globalConfig === 'object' && Array.isArray(globalConfig.whitelistedGuilds) && !globalConfig.whitelistedGuilds.includes(guildId)) {
    return false;
  }
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
  if (msg.content !== '.config.' && msg.content !== '.config. delete') {
    return false;
  }
  if (msg.attachments.length > 1) {
    return false;
  }
  if (!(msg.member instanceof discord.GuildMember)) {
    return false;
  }
  if (!msg.member.can(discord.Permissions.ADMINISTRATOR) && (typeof globalConfig !== 'object' || !Array.isArray(globalConfig.admins) || !globalConfig.admins.includes(msg.author.id))) {
    return false;
  }
  if (msg.attachments.length === 1 && msg.attachments[0].filename === 'config.json') {
    return 'update';
  }
  if (msg.content === '.config. delete') {
    return 'delete';
  }
  return 'check';
}
const toRemove = ['\u0000', '\u0001'];
discord.on(discord.Event.MESSAGE_CREATE, async (message: discord.Message.AnyMessage) => {
  if (typeof config === 'undefined') {
    await InitializeConfig();
  }
  const isCfg = isMessageConfigUpdate(message);
  if (isCfg === 'update') {
    try {
      // let dat = JSON.parse(ab2str(await (await fetch()).arrayBuffer()));
      let data: any;
      data = await fetch(message.attachments[0].url);
      if (!data.ok) {
        await message.reply(`${message.author.toMention()} I couldn\'t grab that file, is another bot deleting the file?`);
      }

      try {
        await message.delete();
      } catch (e) {
        await message.reply(`${message.author.toMention()} Couldnt delete your message! You might want to delete it yourself.`);
      }
      // data = await data.arrayBuffer();
      data = await data.text();

      // data = ab2str(data);
      // data = new TextDecoder("utf8", {ignoreBOM: true}).decode(data);

      let split: Array<string> = data.split('');
      split = split.filter((val) => typeof val === 'string' && !toRemove.includes(val));

      for (let i = 0; i < split.length; i += 1) {
        if (split[i] !== '{') {
          split.splice(i, 1);
        } else {
          break;
        }
      }

      for (let i = split.length - 1; i > 0; i -= 1) {
        if (split[i] !== '}') {
          split.splice(i, 1);
        } else {
          break;
        }
      }
      split = split.filter((val) => typeof val === 'string' && val.length > 0);
      // console.log(split);
      data = split.join('');
      // data = data.split('\n').join('').split('\t').join('').split('\r').join('');

      // await message.reply(`\`\`\`json\n${data.split('').join('|')}\n\`\`\``);
      const check = JSON.parse(data);
      if (typeof check.guildId !== 'string' || check.guildId !== guildId) {
        await message.reply(`${message.author.toMention()} Incorrect guild ID in your config!\n\nAre you uploading it to the right server?`);
        return;
      }
      // let dat = JSON.parse(await (await fetch(message.attachments[0].url)).text());
      // data = JSON.stringify(data);
      // dat = encodeURI(dat);
      // const len = new TextEncoder().encode(data).byteLength;
      const parts = data.match(/[\S\s]{1,5800}/g);

      await configKv.clear();
      for (let i = 0; i < parts.length; i += 1) {
        // console.log(parts[i].length)
        await configKv.put(i.toString(), parts[i]);
      }
      await InitializeConfig(true);
      await message.reply(`${message.author.toMention()} ${discord.decor.Emojis.WHITE_CHECK_MARK} updated the config!`);
    } catch (e) {
      // console.error(e);
      await message.reply(`${message.author.toMention()} Error whilst updating your config:\n\`\`\`${e.message}\n\`\`\``);
    }
  } else if (isCfg === 'check') {
    // console.log('received config check');
    try {
      await message.delete();
    } catch (e) {
    }
    let isDefaultConfig = false;
    const items = await configKv.items();
    let cfg: any;
    if (items.length > 0) {
      cfg = items.map((item: any) => item.value).join('');
      // cfg = JSON.parse(cfg.join(''));
    }
    if (typeof guildConfigs[guildId] !== 'undefined') {
      cfg = guildConfigs[guildId];
    }

    if (!cfg) {
      cfg = defaultConfig;
      isDefaultConfig = true;
    }
    // cfg = JSON.parse(JSON.stringify(cfg));
    if (typeof cfg === 'object' && (typeof cfg.guildId !== 'string' || cfg.guildId !== guildId)) {
      cfg.guildId = guildId;
    }
    /* if (cfg.modules && cfg.modules.logging) {
      cfg.modules.logging.messages = undefined;
      cfg.modules.logging.messagesAuditLogs = undefined;
    } */
    const cfgToRet = typeof cfg !== 'string' ? JSON.stringify(cfg, null, 2) : cfg;
    const returnedMsg = await message.reply({
      content: `${message.author.toMention()} here you go!\n${isDefaultConfig === true ? '\n**WARNING**: This is the default config, you did not have a config previously saved!\n**It is HIGHLY RECOMMENDED to start from a empty config instead!**\n' : ''}\n*This message will self-destruct in 15 seconds*`,
      attachments: [{
        name: 'config.json',
        data: str2ab(cfgToRet),
      }],
    });
    await sleep(15000);
    await returnedMsg.delete();
  } else if (isCfg === 'delete') {
    try {
      await message.delete();
    } catch (e) {
    }
    await configKv.clear();
    await message.reply(`${message.author.toMention()} done!\n\nFeel free to request a new config by typing \`.config.\``);
  }
});
