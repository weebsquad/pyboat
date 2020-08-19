// todo
import * as conf from '../../config';
import { ChannelConfig } from './classes';
import { getTimestamp } from './messages';
import * as utils from './utils';
import * as utils2 from '../../lib/utils';
import { QueuedEvent } from '../../lib/eventHandler/queue';
import { eventData } from './tracking';
import { logDebug } from './events/custom';

const thisGuildId = typeof conf.guildId === 'string' ? conf.guildId : discord.getGuildId();
export * from './utils';

class Event {
  id: string;
  eventName: string;
  payload: Array<any>;
  keys: Array<string>;
  data: any;
  guildId: string | undefined | null = undefined;
  auditLogEntry: any = null;
  constructor(
    id: string,
    guildId: string | undefined | null,
    data: any,
    keys: Array<string>,
    event: string,
    log: null | discord.AuditLogEntry | undefined,
    ...args: any
  ) {
    this.id = id;
    this.keys = keys;
    this.data = data;
    this.guildId = guildId;
    this.auditLogEntry = log;
    this.eventName = event;
    this.payload = args;
  }
}

const regexUrls = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/gim;
const regexClickableMarkdown = /\<[^<>@&!\-=_]*\>\[[^\[\]@&!\-=_]*\]\(https:.*channels\/[^ ]{18}\/[^ ]{18}\/[^ ]{18}\)$/g;

export function getLogChannels(gid: string, event: string, type: string) {
  const arr = new Array<string>();
  const gconf = conf.config;
  let mp = gconf.modules.logging.logChannels;
  if (!mp) {
    return arr;
  }
  if (gid === conf.globalConfig.masterGuild) {
    // calling server is trying to log to master guild
    if (conf.guildId !== gid) {
      mp = {};
    }
    // add our master channel in this case
    for (const key in conf.globalConfig.masterChannel) {
      mp[key] = conf.globalConfig.masterChannel[key];
    }
  }
  for (const k in mp) {
    const v = mp[k];
    if (
      v.scopes.include.includes('*')
      || v.scopes.include.includes(event)
      || v.scopes.include.includes(`${event}.*`)
      || v.scopes.include.includes(`${event}.${type}`)
    ) {
      if (
        v.scopes.exclude.includes(event)
        || v.scopes.exclude.includes(`${event}.*`)
        || v.scopes.exclude.includes(`${event}.${type}`)
      ) {
        continue;
      }
      arr.push(k);
    }
  }
  return arr;
}

async function sendInLogChannel(
  gid: string,
  messages: Map<string, Array<discord.Message.OutgoingMessageOptions>>,
  alwaysWh = false,
  whUrlAlt: string | undefined = undefined,
) {
  const thisGuild = await discord.getGuild(thisGuildId);
  if (thisGuild === null) {
    return;
  }
  const botAvatar = await discord.getBotUser();
  for (const [chId, opts] of messages) {
    const gconf = conf.config;
    const mp = gconf.modules.logging.logChannels;
    let chanCfg = mp[chId];
    if (!chanCfg) {
      if (conf.globalConfig.masterChannel[chId]) {
        chanCfg = conf.globalConfig.masterChannel[chId];
      }
    }
    if (!chanCfg) {
      continue;
    }
    let isWh = false;
    let whUrl = chanCfg.webhookUrl;
    if (typeof chanCfg.webhookUrl === 'string') {
      isWh = true;
    }
    if (alwaysWh && typeof (whUrlAlt) === 'string') {
      isWh = true;
      whUrl = whUrlAlt;
    }
    if (isWh && whUrl.length < 3) {
      isWh = false;
    }

    const channel = await discord.getGuildTextChannel(chId);
    if ((channel === null && !isWh) || opts.length < 1) {
      continue;
    }
    if (isWh && (alwaysWh || opts.length > 1)) {
      const embeds = [];
      for (let i = 0; i < opts.length; i += 1) {
        const opt = opts[i];
        if (opt.embed instanceof discord.Embed) {
          if (alwaysWh) {
            opt.embed.setDescription(`__Crosslog from__: \`${thisGuild.name}\` **[**||\`${thisGuild.id}\`||**]**:\n ${opt.embed.description}`);
          }
          embeds.push(opt.embed);
        } else {
          let _cont = opt.content;
          if (alwaysWh) {
            _cont = `__Crosslog from__: \`${thisGuild.name}\` **[**||\`${thisGuild.id}\`||**]**:\n ${_cont}`;
          }
          await utils2.sendWebhookPostComplex(whUrl, {
            content: _cont,
            allowed_mentions: {},
            avatar_url: botAvatar.getAvatarUrl(),
            username: botAvatar.username,
          });
        }
      }
      if (embeds.length > 1 || alwaysWh) {
        if (embeds.length < 10) {
          await utils2.sendWebhookPostComplex(whUrl, {
            embeds,
            avatar_url: botAvatar.getAvatarUrl(),
            allowed_mentions: {}, // just in case
            username: botAvatar.username,
          });
        } else {
          const newE = new Array<any[]>();
          for (let i = 0; i < embeds.length; i += 1) {
            const indexArr = Math.floor(i / 10);
            if (!Array.isArray(newE[indexArr])) {
              newE[indexArr] = [];
            }
            newE[indexArr].push(embeds[i]);
          }
          for (let i = 0; i < newE.length; i += 1) {
            await utils2.sendWebhookPostComplex(whUrl, {
              embeds: newE[i],
              avatar_url: botAvatar.getAvatarUrl(),
              allowed_mentions: {}, // just in case
              username: botAvatar.username,
            });
          }
        }
      } else {
        channel.sendMessage({
          content: '',
          embed: embeds[0],
          allowedMentions: {},
        });
      }
    } else {
      for (let i = 0; i < opts.length; i += 1) {
        const opt = opts[i];
        if (opt.content === '' && !(opt.embed instanceof discord.Embed)) {
          continue;
        }
        channel.sendMessage(opt);
      }
    }
  }
}

async function parseChannelsData(
  ev: Event,
) {
  const chans = new Map<string, Array<Map<string, string>>>(); // this typing lmfao
  let k2 = [];
  await Promise.all(
    ev.keys.map(async (el: string) => {
      if (typeof ev.data.messages[el] !== 'function') {
        return null;
      }
      const res = await ev.data.messages[el](ev.auditLogEntry, ...ev.payload);
      if (res instanceof Map) {
        res.set('_KEY_', el);
        k2.push(res);
      }
    }),
  );
  k2 = k2.filter((el: any) => el instanceof Map && el.has('_TYPE_'));
  k2.map((el: Map<string, string>) => {
    if (!el.has('_TYPE_') || !el.has('_KEY_')) {
      return;
    }
    const type = el.get('_TYPE_') ?? '';
    const key = el.get('_KEY_');
    const isAuditLog = ev.auditLogEntry instanceof discord.AuditLogEntry && conf.config.modules.logging.auditLogs === true
      ? ev.data.isAuditLog(ev.auditLogEntry, key, ...ev.payload)
      : false;
    if (!el.has('_GUILD_ID_')) {
      el.set('_GUILD_ID_', ev.guildId);
    }
    el.set('isAuditLog', isAuditLog);
    if (
      ev.auditLogEntry instanceof discord.AuditLogEntry
      && !(['MESSAGE_DELETE', 'MESSAGE_DELETE_BULK', 'VOICE_STATE_UPDATE'].includes(ev.eventName))
    ) {
      const oldD = utils2.decomposeSnowflake(ev.id).timestamp;

      ev.id = ev.auditLogEntry.id; // get real date while we're at it
      /* if (conf.config.modules.logging.debug) {
        let _d = oldD - utils2.decomposeSnowflake(ev.id).timestamp;
        if (_d > 10 || _d < -10) c onsole.log(ev.eventName, `event => auditlog reception ${_d}ms diff`);
      } */
    }
    if (isAuditLog && ev.auditLogEntry instanceof discord.AuditLogEntry) {
      const { reason } = ev.auditLogEntry;
      el.set('_ACTORTAG_', utils.getActorTag(ev.auditLogEntry));
      if (reason !== '') {
        el.set('_REASON_RAW_', reason);
        el.set('_REASON_', conf.config.modules.logging.reasonSuffix.replace('_REASON_RAW_', reason));
      } else {
        el.set('_REASON_', '');
        el.set('_REASON_RAW_', '');
      }
    }
    if (el.has('_USERTAG_') && !el.has('_USER_ID_')) {
      let usrid = `${el.get('_USERTAG_')}`;
      if (conf.config.modules.logging.userTag === '_MENTION_') {
        usrid = usrid.substr(2).slice(0, -1);
        if (usrid.includes('!')) {
          usrid = usrid.substr(1);
        }
        el.set('_USER_ID_', usrid);
      }
    }

    /* let txt = utils.getLogMessage(eventName, type, isAuditLog);
      let final = utils.replacePlaceholders(txt, el); */
    const thesechannels = getLogChannels(ev.guildId, ev.eventName, type);
    if (!Array.isArray(thesechannels)) {
      return;
    }
    thesechannels.forEach((ch) => {
      if (!chans.has(ch)) {
        chans.set(ch, new Array<Map<string, string>>());
      }
      const curr = chans.get(ch);
      if (!curr) {
        throw new Error('');
      } // just to void that error below, lol, this should never be undefined
      curr.push(el);
      chans.set(ch, curr);
    });
    return '';
  });
  return chans;
}

async function getMessages(
  guildId: string,
  chans: Map<string, Array<Map<string, string>>>,
  ev: Event,
) {
  // if (avatar === '') avatar = (await discord.getBotUser()).getAvatarUrl();
  const msgs = new Map<string, Array<discord.Message.OutgoingMessageOptions>>();
  /* if (!msgs.has(guildId))
    msgs.set(
      guildId,
      new Map<string, Array<discord.Message.OutgoingMessageOptions>>()
    );
  let guild = msgs.get(guildId);
  if (!guild) throw new Error('h'); */
  const date = new Date(utils2.decomposeSnowflake(ev.id).timestamp);
  for (const [chId, v] of chans) {
    /* Parse Messages */
    const confUse = conf.config;
    const cfgG = confUse.modules.logging.logChannels;
    if (!cfgG) {
      continue;
    }
    let cfg = cfgG[chId];
    if (!cfg) {
      if (conf.globalConfig.masterChannel[chId]) {
        cfg = conf.globalConfig.masterChannel[chId];
      } else {
        throw new Error('h');
      }
    } // just to void that error below, lol, this should never be undefined

    if (!cfg.embed) {
      let txt = '';
      const ts = getTimestamp(utils.changeLoggingTimezone(date));
      if (typeof ts !== 'string' || ts === '') {
        throw new Error('logging timestamps improperly formatted!');
      }
      v.forEach((map) => {
        if (map === undefined || map === null) {
          return;
        }
        const type = `${map.get('_TYPE_')}`;
        let isAuditLog = false;
        const isAl: any = map.get('isAuditLog');
        if (
          isAl === 'true'
            || isAl === true
        ) {
          isAuditLog = true;
        }
        const temp = utils.getLogMessage(ev.eventName, type, isAuditLog);
        if (typeof temp !== 'string') {
          return;
        }
        let final = utils.replacePlaceholders(temp, map);
        const jumps = final.match(regexClickableMarkdown);
        if (jumps !== null) {
          jumps.forEach((e) => {
            final = final.split(e).join('');
          });
        }
        if (txt !== '') {
          txt += '\n';
        }
        if (cfg.showTimestamps) {
          txt += `${ts} `;
        }
        if (cfg.showEventName) {
          let event = ev.eventName;
          if (event.substr(0, 1) === '|' || event === 'DEBUG') {
            event = `${event.substr(0, 1) === '|' ? event.substr(1) : event} - ${type}`;
          }
          if (event.includes('_')) {
            event = event.split('_').join(' ');
          }
          event = event
            .split(' ')
            .map((e) => {
              if (e.length > 1) {
                e = e.substring(0, 1).toUpperCase()
                  + e.substring(1).toLowerCase();
              }
              return e;
            })
            .join(' ');
          txt += `(\`${event}\`) `;
        }

        txt += `${final}`;
      });
      /*
      if (!guild.has(chId)) {
        guild.set(chId, new Array<discord.Message.OutgoingMessageOptions>());
        msgs.set(guildId, guild);
      }
      let _act = guild.get(chId); */
      if (txt !== '' && txt.length > 0) {
        if (!msgs.has(chId)) {
          msgs.set(chId, new Array<discord.Message.OutgoingMessageOptions>());
        }
        const _chan = msgs.get(chId);
        if (_chan) {
          _chan.push({ content: txt, allowedMentions: {} });
          msgs.set(chId, _chan);
        }
        /* guild.set(chId, _act);
        msgs.set(guildId, guild); */
      }
    } else {
      const embeds = new Array<discord.Embed>();
      await Promise.all(
        v.map(async (map) => {
          if (map === undefined || map === null) {
            return;
          }
          const type = `${map.get('_TYPE_')}`;
          let isAuditLog = false;
          const em = new discord.Embed();
          const authorActor = false;
          const isAl: any = map.get('isAuditLog');
          if (
            isAl === 'true'
            || isAl === true
          ) {
            isAuditLog = true;
          }
          let addFooter = '';
          let temp = utils.getLogMessage(
            ev.eventName,
            type,
            isAuditLog,
            isAuditLog,
          );
          if (typeof temp !== 'string') {
            return;
          }
          if (isAuditLog && ev.auditLogEntry instanceof discord.AuditLogEntry) {
            if (map.has('_ACTORTAG_')) {
              let rep = false;
              if (temp.indexOf('_ACTORTAG_') === 0) {
                rep = true;
              } else {
                // clear emoji
                const cleared = temp
                  .substring(0, temp.indexOf('_ACTORTAG_'))
                  .split(' ')
                  .join('');
                rep = utils2.containsOnlyEmojis(cleared);
              }
              if (rep) {
                temp = temp.replace('_ACTORTAG_', '');
                em.setAuthor({
                  name: ev.auditLogEntry.user.getTag(),
                  iconUrl: ev.auditLogEntry.user.getAvatarUrl(),
                });
                addFooter = `Actor: ${ev.auditLogEntry.user.id}`;
              }
            }
          } else if (map.has('_USERTAG_')) {
            let rep = false;
            if (temp.indexOf('_USERTAG_') === 0) {
              rep = true;
            } else {
              // clear emoji
              const cleared = temp
                .substring(0, temp.indexOf('_USERTAG_'))
                .split(' ')
                .join('');
              rep = utils2.containsOnlyEmojis(cleared);
            }
            if (rep) {
              let usrid = `${map.get('_USERTAG_')}`;
              if (conf.config.modules.logging.userTag === '_MENTION_') {
                usrid = usrid.substr(2).slice(0, -1);
                if (usrid.includes('!')) {
                  usrid = usrid.substr(1);
                }
              }

              const usr = await discord.getUser(usrid);
              if (usr !== null) {
                temp = temp.replace('_USERTAG_', '');
                em.setAuthor({
                  name: usr.getTag(),
                  iconUrl: usr.getAvatarUrl(),
                });
                addFooter = `User: ${usr.id}`;
              }
            }
          }

          let msg = utils.replacePlaceholders(temp, map);
          const _urls = msg.match(regexUrls);
          if (
            _urls !== null
            && _urls.length === 1
            && _urls[0].includes('cdn.discordapp.com')
          ) {
            msg = msg.split(_urls[0]).join('');
            em.setThumbnail({ url: _urls[0] });
          }

          const jumps = msg.match(regexClickableMarkdown);
          if (
            jumps !== null
            && jumps.length === 1
            && jumps[0].includes('discord.com')
          ) {
            msg = msg.split(jumps[0]).join('');
            const name = jumps[0]
              .match(/\<[^<>]*\>/g)[0]
              .split('<')
              .join('')
              .split('>')
              .join('');
            const val = jumps[0].match(
              /\[[^\[\]]*\]\(https:.*channels\/.{18}\/.{18}\/.{18}\)$/g,
            )[0];
            em.setFields([
              {
                name,
                value: val,
                inline: false,
              },
            ]);
          }
          em.setDescription(msg);

          if (cfg.showTimestamps) {
            em.setTimestamp(date.toISOString());
          }
          if (cfg.embedColor) {
            em.setColor(cfg.embedColor);
          }
          if (cfg.showEventName) {
            let event = ev.eventName;
            if (event.substr(0, 1) === '|' || event === 'DEBUG') {
              event = `${event.substr(0, 1) === '|' ? event.substr(1) : event} - ${type}`;
            }
            if (event.includes('_')) {
              event = event.split('_').join(' ');
            }
            event = event
              .split(' ')
              .map((e) => {
                if (e.length > 1) {
                  e = e.substring(0, 1).toUpperCase()
                    + e.substring(1).toLowerCase();
                }
                return e;
              })
              .join(' ');

            em.setTitle(event);
          }
          let footr = '';
          if (utils.isDebug()) {
            footr += `${ev.eventName}.${type}`;
          }
          if (
            cfg.description
            && cfg.description.length > 0
            && cfg.description !== 'default'
          ) {
            if (footr !== '') {
              footr += ' • ';
            }
            footr += cfg.description;
          }
          if (addFooter !== '') {
            if (footr !== '') {
              footr += ' • ';
            }
            footr += addFooter;
          }

          if (isAuditLog && ev.auditLogEntry instanceof discord.AuditLogEntry) {
            if (authorActor) {
              em.setAuthor({
                name: ev.auditLogEntry.user.getTag(),
                iconUrl: ev.auditLogEntry.user.getAvatarUrl(),
              });
              footr += ` • Actor: ${ev.auditLogEntry.user.id}`;
            }

            if (ev.auditLogEntry.reason && ev.auditLogEntry.reason.length > 0) {
              em.setFields([
                {
                  inline: false,
                  name: 'Reason',
                  value: ev.auditLogEntry.reason,
                },
              ]);
            }
          }
          let icoFooter;
          if (
            typeof cfg.footerAvatar === 'string'
            && cfg.footerAvatar !== ''
          ) {
            icoFooter = cfg.footerAvatar;
          }
          if (footr !== '') {
            em.setFooter({ text: footr, iconUrl: icoFooter });
          }
          embeds.push(em);
        }),
      );

      embeds.forEach(async (em) => {
        /* if (!guild) return;
        if (!guild.has(chId))
          guild.set(chId, new Array<discord.Message.OutgoingMessageOptions>());
        let _act = guild.get(chId);
        if (_act) {
          _act.push({
            content: '',
            embed: em,
            allowedMentions: {}
          });
          guild.set(chId, _act);
          msgs.set(guildId, guild);
        } */

        if (!msgs.has(chId)) {
          msgs.set(chId, new Array<discord.Message.OutgoingMessageOptions>());
        }
        const _chan = msgs.get(chId);
        if (_chan) {
          _chan.push({
            content: '',
            embed: em,
            allowedMentions: {},
          });
          msgs.set(chId, _chan);
        }
      });
    }
  }
  return msgs;
}

function combineMessages(
  msgs: Map<string, Array<discord.Message.OutgoingMessageOptions>>,
) {
  const n = msgs;
  for (const [chId, opts] of msgs) {
    const newarr = new Array<discord.Message.OutgoingMessageOptions>();
    let contents = '';
    if (opts.length < 1) {
      continue;
    }
    opts.map((op) => {
      if (op.embed instanceof discord.Embed) {
        newarr.push(op);
      } else {
        contents += `${op.content}\n`;
      }
    });
    if (contents.length >= 1990) {
      const lines = contents.split('\n');
      // lines = lines.slice(0, lines.length - 1);
      let accum = [];
      for (let i = 0; i < lines.length; i += 1) {
        const currl = (accum.join('\n') + lines[i]).length;
        if (currl > 1985 && i !== lines.length - 1) {
          let thism = accum.join('\n');
          thism += '\n';
          newarr.push({ content: thism, allowedMentions: {} });
          accum = [];
        } else if (i === lines.length - 1) {
          if (currl < 1985) {
            accum.push(lines[i]);
          }

          let thism = accum.join('\n');
          thism += '\n';
          newarr.push({ content: thism, allowedMentions: {} });
          accum = [];
          if (currl >= 1985) {
            newarr.push({ content: `\n${lines[i]}\n` });
          }
        }
        if (i !== lines.length - 1) {
          accum.push(lines[i]);
        }
      }
    } else {
      newarr.push({ content: contents, allowedMentions: {} });
    }
    if (contents === '' || contents.length < 1) {
      continue;
    }
    n.set(chId, newarr);
    // n.set(guildId, data);
  }

  return n;
}

export async function handleMultiEvents(q: Array<QueuedEvent>) {
  try {
    if (conf.config.modules.logging.enabled !== true) {
      return;
    }
    let messages = new Map<string, Array<discord.Message.OutgoingMessageOptions>>();
    const tdiff = new Date().getTime();

    for (let i = 0; i < q.length; i += 1) {
      const qev = q[i];
      if (qev.guildId !== thisGuildId && typeof thisGuildId === 'string') {
        qev.guildId = thisGuildId;
      }
      if (qev.eventName === 'DEBUG' && !utils.isDebug() && !utils.isMasterInDebug()) {
        continue;
      }
      const date = new Date(utils2.decomposeSnowflake(qev.id).timestamp);
      let data = eventData.get(qev.eventName);

      if (!data && qev.eventName.substr(0, 1) === '|') {
        data = eventData.get('CUSTOM');
      }
      if (!data || data === null) {
        continue;
      }
      if (
        typeof data.getKeys !== 'function'
      || typeof data.messages !== 'object'
      ) {
        continue;
      }
      if (qev.auditLogEntry instanceof discord.AuditLogEntry && conf.config.modules.logging.ignores) {
        if (discord.getBotId() === qev.auditLogEntry.userId) {
          if (conf.config.modules.logging.ignores.self === true && conf.config.modules.logging.ignores.selfAuditLogs === true && utils.isIgnoredUser(qev.auditLogEntry.userId)) {
            return;
          }
        } else if (conf.config.modules.logging.ignores.extendUsersToAuditLogs === true && utils.isIgnoredUser(qev.auditLogEntry.userId)) {
          return;
        }
      }
      if (qev.auditLogEntry instanceof discord.AuditLogEntry && conf.config.modules.logging.auditLogs === false) {
        qev.auditLogEntry = null;
      }
      const isExt = qev.eventName === 'DEBUG' && utils.isExternalDebug();
      if (isExt) {
        qev.guildId = conf.globalConfig.masterGuild;
      }

      const keys = await data.getKeys(qev.auditLogEntry, ...qev.payload);
      // let isAuditLog = false;
      const al = <any>qev.auditLogEntry;
      const obj = new Event(
        utils2.composeSnowflake(date.getTime()),
        thisGuildId,
        data,
        keys,
        qev.eventName,
        al,
        ...qev.payload,
      );

      const chansTemp = await parseChannelsData(obj);

      const messagesTemp = await getMessages(obj.guildId, chansTemp, obj);

      for (const [chid, opts] of messagesTemp) {
        if (!messages.has(chid)) {
          messages.set(chid, []);
        }
        const _arr = messages.get(chid);
        if (_arr) {
          _arr.push(...opts);
          messages.set(chid, _arr);
        }
      }
    }

    // sort!
    /*
  for (let [chId, opts] of messages) {
    let sorted = opts.sort(function(a, b) {
let tsa = utils.decomposeSnowflake(a.id).timestamp;
    let tsb = utils.decomposeSnowflake(b.id).timestamp;
    return tsa - tsb;
    });
    messages.set(chId, sorted);
  } */
    if (utils.isDebug()) {
      console.log('logging trigger multi', messages);
    }
    messages = combineMessages(messages);
    await sendInLogChannel(thisGuildId, messages);
  } catch (e) {
    if (utils.isDebug()) {
      console.error(e);
    }
    await logDebug('BOT_ERROR', new Map<string, any>([
      ['ERROR', `Error at logging.handleMultiEvents\n${e.stack}`],
    ]));
  }
}

export async function handleEvent(
  id: string,
  guildId: string,
  eventName: string,
  log: discord.AuditLogEntry | undefined | null,
  ...args: any
) {
  try {
    if (conf.config.modules.logging.enabled !== true) {
      return;
    }
    if (typeof guildId !== 'string') {
      guildId = '0';
    }
    if (guildId === '0') {
      guildId = thisGuildId;
    }
    if (eventName === 'DEBUG' && !utils.isDebug() && !utils.isMasterInDebug()) {
      return;
    }

    const isExt = eventName === 'DEBUG' && utils.isExternalDebug();
    if (isExt) {
      guildId = conf.globalConfig.masterGuild;
    }
    const date = new Date(utils2.decomposeSnowflake(id).timestamp);
    let data = eventData.get(eventName);
    if (!data && eventName.substr(0, 1) === '|') {
      data = eventData.get('CUSTOM');
    }
    if (!data || data === null) {
      throw new Error(`handleEvent missing data definition for event ${eventName}`);
    }
    if (
      typeof data.getKeys !== 'function'
    || typeof data.messages !== 'object'
    ) {
      throw new Error(`handleEvent missing getKeys/messages definitions for event ${eventName}`);
    }
    if (log instanceof discord.AuditLogEntry && conf.config.modules.logging.ignores) {
      if (discord.getBotId() === log.userId) {
        if (conf.config.modules.logging.ignores.self === true && conf.config.modules.logging.ignores.selfAuditLogs === true && utils.isIgnoredUser(log.userId)) {
          return;
        }
      } else if (conf.config.modules.logging.ignores.extendUsersToAuditLogs === true && utils.isIgnoredUser(log.userId)) {
        return;
      }
    }
    if (log instanceof discord.AuditLogEntry && conf.config.modules.logging.auditLogs === false) {
      log = null;
    }
    let keys: any;
    if (typeof data.getKeys === 'function') {
      keys = await data.getKeys(log, ...args);
    }
    if (!Array.isArray(keys)) {
      throw new Error('handleEvent keys not an array!');
    }
    // let isAuditLog = false;

    // check ignores

    const obj = new Event(
      utils2.composeSnowflake(date.getTime()),
      guildId,
      data,
      keys,
      eventName,
      log,
      ...args,
    );
    if (isExt) {
      const chans = await parseChannelsData(obj);
      let messages = await getMessages(guildId, chans, obj);
      messages = combineMessages(messages);
      await sendInLogChannel(guildId, messages, true, conf.globalConfig.masterWebhook);
      return;
    }
    if (utils.isDebug()) {
      console.log('logging trigger', eventName, obj);
    }

    const chans = await parseChannelsData(obj);
    // if (utils.isDebug(true)) console.log('handleevent.parseChannelData', chans);
    let messages = await getMessages(guildId, chans, obj);
    // if (utils.isDebug(true)) console.log('handleevent.getMessages', messages);

    messages = combineMessages(messages);
    // if (utils.isDebug(true)) console.log('handleevent.combineMessages', messages);

    await sendInLogChannel(guildId, messages);
  } catch (e) {
    if (utils.isDebug()) {
      console.error(e);
    }
    await logDebug('BOT_ERROR', new Map<string, any>([
      ['ERROR', `Error at logging.handleEvent.${eventName}\n${e.stack}`],
    ]),
                   id);
  }
}
