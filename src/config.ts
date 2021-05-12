/* eslint-disable import/no-mutable-exports */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as updates from './updates';

import * as i18n from './localization/interface';

export let config: any;
export const guildId = discord.getGuildId();

export class ConfigError extends Error {
  configPath: string;
  constructor(configPath: string, message: string) {
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
export const version = '__VERSION__'; // @ts-ignore

export const globalConfig = <any>{
  masterWebhook: 'https://discord.com/api/webhooks/752883278226259998/UDhEbhbgJjiFlZXOTjZn1-_pP_JWsp7lmC0XO8W_Q0vAQQzyFM_zyQhmpVjYDoQ2prYZ',
  botUsersWebhook: 'https://discord.com/api/webhooks/774300244249935913/SXWej5vZP9IYUN47IQo-m08js8hVb4Cw3g0KS9Fg9khfbyKoJGKYvaNbbXS2hnvaX3OO',
  controlUsersRole: '752877222452527227',
  metalApi: {
    key: 'spdyzhvtzdavalwcvrxxzz9OX',
    url: 'https://dapiproxy.homo.workers.dev',
    botToken: 'NzUyODcyNTc3NDk1NDY2MDE2.X1d9Og.Fhlte0Lly6QkfPmrRie-a0uYyBQ',
  },
  github: {
    // @ts-ignore
    token: '__GH_TOKEN__',
    org: 'weebsquad',
    deployments: { pyboat: 'node.js.deploy.yml' },
  },
  localization: {
    cdnUrl: 'https://pyboat.i0.tf/i18n/',
    default: 'source/base',
  },
  memStore: {
    key: 'i:Vgt0QkLnw>9Q8-O].-p)CTiBvSBXes!KTrwFU=y_zzx*SYPL*,!nwev_6Q0K%]',
    url: 'http://51.38.114.230:8000',
  },
  ranks: Ranks,
  Ranks, // lol
};

// @ts-ignore
export const deployDate = new Date(__DATE_PUBLISH__);
const defaultConfig = { // for non-defined configs!
  guildId,
  language: globalConfig.localization.default,
  levels: {
    users: {},
    roles: {},
  },
  modules: {
    queue: false,
    reddit: {
      enabled: false,
      subs: [],
    },
    logging: { // event logging module
      enabled: false,
      // should we try to pull audit log data for every event, or just display raw data??
      auditLogs: true,
      logChannels: {},
      messages: {}, // defaults
      messagesAuditLogs: {}, // defaults
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
      userTag: '{MENTION}',
      // tag type to use for actors
      actorTag: '{MENTION}',
      // automatically append reason suffix below when reason not already found on the message?
      suffixReasonToAuditlog: true,
      // reason suffix to append
      reasonSuffix: ' with reason `{REASON_RAW}`',
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
      duplicateRegistry: true,
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
      targeting: {
        reqDiscordPermissions: true,
        checkLevels: true,
        checkRoles: true,
        allowSelf: false,
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
      autoPrune: {
        enabled: false,
        channels: {},
      },
    },
    customCode: {
      enabled: false,
      url: '',
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
          dest[key].forEach((e: any) => {
            if (typeof e.__key !== 'undefined') {
              let keyName = e.__key;
              if (typeof keyName === 'number') {
                keyName = keyName.toString();
              }
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

let loadingConf = false;
let lastTry = Date.now();
export async function InitializeConfig(bypass = false): Promise<boolean> {
  const result = await beginLoad(bypass);
  return result;
  /* let result: any;
  try {
    result = await pylon.requestCpuBurst(async () => {
      const resC = await beginLoad(bypass);
      return resC;
    });
  } catch (_) {
    result = await beginLoad(bypass);
  }
  return result; */
}
async function beginLoad(bypass: boolean): Promise<boolean> {
  if (loadingConf) {
    const diff = Date.now() - lastTry;
    if (diff > 60 * 1000) {
      loadingConf = false;
    }
  }
  if (loadingConf && !bypass) {
    const start = Date.now();
    let runs = 3;
    while (typeof config === 'undefined') {
      if (typeof config !== 'undefined' || !loadingConf) {
        break;
      }
      if ((Date.now() - start) >= 10000) {
        break;
      }
      runs++;
      await sleep(Math.min(1000, Math.pow(2, runs)));
    }
    return typeof config !== 'undefined';
  }
  if (!bypass) {
    config = undefined;
  }
  lastTry = Date.now();
  loadingConf = true;
  try {
    const globs = await (await fetch('https://pyboat.i0.tf/globalconf.json')).json();
    for (const k in globs) {
      const obj = globs[k];
      globalConfig[k] = obj;
    }
  } catch (e) {
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
  globalConfig.botUser = await discord.getBotUser();
  if (!globalConfig.botUser || globalConfig.botUser.id !== globalConfig.botId) {
    console.warn('Couldnt fetch bot user account details');
    return false;
  }
  if (Array.isArray(globalConfig.whitelistedGuilds) && !globalConfig.whitelistedGuilds.includes(guildId)) {
    console.warn('Not whitelisted');
    config = undefined;
    loadingConf = false;
    return false;
  }

  const guild = await discord.getGuild();
  if (guild === null) {
    console.warn('Couldnt fetch guild');
    loadingConf = false;
    return false;
  }
  if (!globalConfig.version) {
    globalConfig.version = version;
  }
  if (guild.id !== globalConfig.masterGuild && discord.getBotId() === globalConfig.botId) {
    /*
    let gaCheck: discord.GuildMember | false = false;
    for (const key in globalConfig.admins) {
      const checkThis = await guild.getMember(globalConfig.admins[key]);
      if (checkThis) {
        gaCheck = checkThis;
        break;
      }
    }
    if (!gaCheck) {
      console.warn('Guild not authorized to run PyBoat');
      config = undefined;
      loadingConf = false;
      return false;
    }
    if (!gaCheck.can(discord.Permissions.MANAGE_GUILD)) {
      console.warn('Not enough permissions to redeploy PyBoat');
      config = undefined;
      loadingConf = false;
      return false;
    }
    */

    // check bot versioning
    if (version !== globalConfig.version) {
      console.error('Version mismatch! Bot needs update. Disabling bot in 72h');
      // pls
    }
  }
  // console.log('version:', vers, 'globalvers:', globalConfig.version);
  const oldVers = (await pylon.kv.get('__botVersion')) ?? version;
  if (oldVers !== globalConfig.version && version === globalConfig.version) {
    // run updates only when old version was different, and we are currently up to date
    await updates.runUpdates(typeof version === 'string' ? version : '', globalConfig.version);
    await pylon.kv.put('__botVersion', version);
  }
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
  }

  console.log('loading language files');
  await i18n.Initialize(defaultConfig.language, cfg.language);
  defaultConfig.modules.logging.messages = i18n.language.modules.logging.l_messages;
  defaultConfig.modules.logging.messagesAuditLogs = i18n.language.modules.logging.l_messages_logs;
  // @ts-ignore
  defaultConfig.modules.logging.messages.DEBUG = {
    BOT_ERROR: '⛔ Bot error\n```js\n{ERROR}\n```',
    BOT_STARTED: '✅ Bot code reloaded',
    RAW_EVENT: '📥 received `{EVENT}` / Queue: **{QUEUE}**',
    CRON_RAN: '⌚ Cron task `{CRON_NAME}` executed.',
    BLACKLISTED_USER_ACTION: '⛔ global-blacklisted user {USERTAG} tried to perform {ACTION}',
  };
  config = loadConfigDefaults(cfg);
  // @ts-ignore
  const cput = Math.floor(await pylon.getCpuTime());
  console.info(`Initialized on VM (config loaded) Cpu time so far: ${cput}ms`);
  // startup our custom code engine
  return true;
}

function str2ab(str: string) {
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
        await message.reply(i18n.setPlaceholders(i18n.language.config.cant_download_file, ['user_mention', message.author.toMention()]));
      }

      try {
        await message.delete();
      } catch (e) {
        await message.reply(i18n.setPlaceholders(i18n.language.config.cant_delete_message, ['user_mention', message.author.toMention()]));
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
      data = split.join('');

      // await message.inlineReply(`\`\`\`json\n${data.split('').join('|')}\n\`\`\``);
      const check = JSON.parse(data);
      if (typeof check.guildId !== 'string' || check.guildId !== guildId) {
        await message.reply(i18n.setPlaceholders(i18n.language.config.incorrect_guild_id, ['user_mention', message.author.toMention()]));
        return;
      }
      // let dat = JSON.parse(await (await fetch(message.attachments[0].url)).text());
      // data = JSON.stringify(data);
      // dat = encodeURI(dat);
      // const len = new TextEncoder().encode(data).byteLength;
      const parts = data.match(/[\S\s]{1,5800}/g);

      await configKv.clear();
      for (let i = 0; i < parts.length; i += 1) {
        await configKv.put(i.toString(), parts[i]);
      }
      await InitializeConfig(true);
      await message.reply(i18n.setPlaceholders(i18n.language.config.updated_config, ['user_mention', message.author.toMention()]));
    } catch (e) {
      await message.reply(i18n.setPlaceholders(i18n.language.config.error_updating_config, ['user_mention', message.author.toMention(), 'error', `\`\`\`\n${e.message}\n\`\`\``]));
    }
  } else if (isCfg === 'check') {
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
      content: i18n.setPlaceholders(isDefaultConfig === true ? i18n.language.config.get_default_config : i18n.language.config.get_config, ['user_mention', message.author.toMention()]),
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
    await message.reply(i18n.setPlaceholders(i18n.language.config.deleted_config, ['user_mention', message.author.toMention()]));
  }
});
