// todo
import * as conf from '../../config';
import { getTimestamp } from './messages';
import * as utils from './utils';
import * as utils2 from '../../lib/utils';
import { QueuedEvent } from '../../lib/eventHandler/queue';
import { eventData } from './tracking';
import { logDebug } from './events/custom';
import * as queue from './queue';
import { ParsedAttachment } from './classes';

const thisGuildId = typeof conf.guildId === 'string' ? conf.guildId : discord.getGuildId();
export * from './utils';
const imageTypes = ['png', 'jpg', 'jpeg', 'svg', 'bmp'];
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
  if (event.length < 2) {
    return arr;
  }
  if (event.substr(0, 1) === '|') {
    event = event.substr(1);
  }

  for (const k in mp) {
    const v = mp[k];
    if (typeof v.scopes !== 'object') {
      break;
    }
    if (!Array.isArray(v.scopes.include) && !Array.isArray(v.scopes.exclude)) {
      break;
    }
    if ((Array.isArray(v.scopes.include)) && (v.scopes.include.includes('*')
      || v.scopes.include.includes(event)
      || v.scopes.include.includes(`${event}.*`)
      || v.scopes.include.includes(`${event}.${type}`))) {
      if ((Array.isArray(v.scopes.exclude)) && (
        v.scopes.exclude.includes(event)
        || v.scopes.exclude.includes(`${event}.*`)
        || v.scopes.exclude.includes(`${event}.${type}`))) {
        continue;
      }
      arr.push(k);
    }
  }
  return arr;
}

export async function sendInLogChannel(
  messages: Map<string, Array<discord.Message.OutgoingMessageOptions>>,
  alwaysWh = false,
  whUrlAlt: string | undefined = undefined,
) {
  const thisGuild = await discord.getGuild(thisGuildId);
  if (thisGuild === null) {
    return;
  }
  const botAvatar = conf.globalConfig.botUser;
  for (const [chId, opts] of messages) {
    let webhookSends = 1;
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
    // WEBHOOK
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
          if (webhookSends % 3 === 0 && webhookSends > 0) {
            await channel.sendMessage(opt);
            webhookSends = 1;
          } else {
            await utils2.executeWebhook(whUrl, _cont, undefined, botAvatar.username, botAvatar.getAvatarUrl(), false, {});
            webhookSends += 1;
          }
        }
      }
      if (embeds.length > 1) {
        if (embeds.length < 10) {
          await utils2.executeWebhook(whUrl, '', embeds, botAvatar.username, botAvatar.getAvatarUrl(), false, {});
          webhookSends += 1;
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
            await utils2.executeWebhook(whUrl, '', newE[i], botAvatar.username, botAvatar.getAvatarUrl(), false, {});
            webhookSends++;
          }
        }
      } else if (channel && channel instanceof discord.GuildChannel) {
        await channel.sendMessage({
          embed: embeds[0],
          allowedMentions: {},
        });
      }
    // NORMAL
    } else {
      for (let i = 0; i < opts.length; i += 1) {
        const opt = opts[i];
        if (opt.content === '' && !(opt.embed instanceof discord.Embed)) {
          continue;
        }
        await channel.sendMessage({ ...opt, allowedMentions: {} });
      }
    }
  }
}

async function parseChannelsData(
  ev: Event,
) {
  const chans = new Map<string, Array<Map<string, any>>>(); // this typing lmfao
  let k2 = [];
  await Promise.all(
    ev.keys.map(async (el: string) => {
      if (typeof ev.data.messages[el] !== 'function') {
        return null;
      }
      const res = await ev.data.messages[el](ev.auditLogEntry, ...ev.payload);
      if (res instanceof Map) {
        res.set('KEY', el);
        k2.push({ id: ev.keys.indexOf(el), val: res });
      }
    }),
  );
  k2 = k2.sort((a, b) => a.id - b.id).map((v) => v.val);
  k2 = k2.filter((el: any) => el instanceof Map && el.has('TYPE'));
  k2.map((el: Map<string, any>) => {
    if (!el.has('TYPE') || !el.has('KEY')) {
      return;
    }
    const type = el.get('TYPE') ?? '';
    const key = el.get('KEY');
    const isAuditLog = ev.auditLogEntry instanceof discord.AuditLogEntry && conf.config.modules.logging.auditLogs === true
      ? ev.data.isAuditLog(ev.auditLogEntry, key, ...ev.payload)
      : false;
    if (!el.has('GUILD_ID')) {
      el.set('GUILD_ID', ev.guildId);
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
      el.set('ACTORTAG', utils.getActorTag(ev.auditLogEntry.user));
      el.set('ACTOR_ID', ev.auditLogEntry.user.id);
      el.set('ACTOR', ev.auditLogEntry.user);
      if (reason !== '') {
        el.set('REASON_RAW', reason);
        el.set('REASON', conf.config.modules.logging.reasonSuffix.replace('REASON_RAW', reason));
      } else {
        el.set('REASON', '');
        el.set('REASON_RAW', '');
      }
    }
    if (el.has('USERTAG') && !el.has('USER_ID') && el.get('USERTAG') !== '') {
      let usrid = `${el.get('USERTAG')}`;
      if (conf.config.modules.logging.userTag === 'MENTION') {
        usrid = usrid.substr(2).slice(0, -1);
        if (usrid.includes('!')) {
          usrid = usrid.substr(1);
        }
        el.set('USER_ID', usrid);
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
        chans.set(ch, new Array<Map<string, any>>());
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
  chans: Map<string, Array<Map<string, any>>>,
  ev: Event,
) {
  const msgs = new Map<string, Array<discord.Message.OutgoingMessageOptions>>();
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
      const atts: Array<ParsedAttachment> = [];
      v.forEach((map) => {
        if (map === undefined || map === null) {
          return;
        }
        const type = `${map.get('TYPE')}`;
        let isAuditLog = false;
        const isAl: any = map.get('isAuditLog');
        if (map.has('ATTACHMENTS')) {
          const thisAtts = map.get('ATTACHMENTS');
          atts.push(...thisAtts);
        }
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
      if (txt !== '' && txt.length > 0) {
        if (!msgs.has(chId)) {
          msgs.set(chId, new Array<discord.Message.OutgoingMessageOptions>());
        }
        const _chan = msgs.get(chId);
        if (_chan) {
          const _objn: discord.Message.OutgoingMessageOptions = { content: txt };
          if (atts.length > 0) {
            _objn.attachments = atts.map((vv) => ({ name: vv.name, data: vv.data }));
          }
          _chan.push(_objn);
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
          const type = `${map.get('TYPE')}`;
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
          if (map.has('ACTORTAG')) {
            let rep = false;
            if (temp.indexOf('ACTORTAG') === 0) {
              rep = true;
            } else {
              // clear emoji
              const cleared = temp
                .substring(0, temp.indexOf('ACTORTAG'))
                .split(' ')
                .join('');
              rep = utils2.containsOnlyEmojis(cleared);
            }
            if (rep) {
              let usr;
              if (map.has('ACTOR')) {
                usr = map.get('ACTOR');
              } else if (map.get('ACTORTAG') === 'SYSTEM') {
                usr = 'SYSTEM';
              } else if (ev.auditLogEntry instanceof discord.AuditLogEntry) {
                usr = ev.auditLogEntry.user;
              } else {
                let usrid = '';
                if (map.has('ACTOR_ID')) {
                  usrid = map.get('ACTOR_ID');
                } else if (conf.config.modules.logging.actorTag === 'MENTION') {
                  usrid = map.get('ACTORTAG');
                  usrid = usrid.substr(2).slice(0, -1);
                  if (usrid.includes('!')) {
                    usrid = usrid.substr(1);
                  }
                }

                if (usrid !== '' && !(usr instanceof discord.User) && usr !== 'SYSTEM') {
                  usr = await utils2.getUser(usrid);
                }
              }
              if (usr instanceof discord.User) {
                em.setAuthor({
                  name: usr.getTag(),
                  iconUrl: usr.getAvatarUrl(),
                });
                addFooter = `Actor: ${usr.id}`;
                temp = temp.replace('ACTORTAG', '');
              } else if (typeof usr === 'string' && usr === 'SYSTEM') {
                em.setAuthor({
                  name: usr,
                });
                addFooter = `Actor: ${usr}`;
                temp = temp.replace('ACTORTAG', '');
              }
            }
          } else if (map.has('USERTAG') && map.get('USERTAG') !== '') {
            let rep = false;
            if (temp.indexOf('USERTAG') === 0) {
              rep = true;
            } else {
              // clear emoji
              const cleared = temp
                .substring(0, temp.indexOf('USERTAG'))
                .split(' ')
                .join('');
              rep = utils2.containsOnlyEmojis(cleared);
            }
            if (rep) {
              let usr;
              let usrid = '';
              if (map.has('USER')) {
                usr = map.get('USER');
              } else if (map.has('USER_ID')) {
                usrid = map.get('USER_ID');
              } else if (conf.config.modules.logging.userTag === 'MENTION') {
                usrid = map.get('USERTAG');
                usrid = usrid.substr(2).slice(0, -1);
                if (usrid.includes('!')) {
                  usrid = usrid.substr(1);
                }
              }
              if (usrid !== '' && !(usr instanceof discord.User)) {
                usr = await utils2.getUser(usrid);
              }
              if (usr instanceof discord.User) {
                temp = temp.replace('USERTAG', '');
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
          if (Array.isArray(_urls)) {
            const cdnLink = _urls.filter((url) => url.includes('cdn.discordapp.com'));
            if (
              Array.isArray(cdnLink)
              && cdnLink.length === 1
            ) {
              msg = msg.split(cdnLink[0]).join('');
              em.setThumbnail({ url: cdnLink[0] });
            }
          }
          if (!em.thumbnail || !em.thumbnail.url) {
            // check sent attachments
            const atts = map.get('ATTACHMENTS');
            if (atts && Array.isArray(atts)) {
              const firstShowable: ParsedAttachment | undefined = atts.find((vv: ParsedAttachment) => imageTypes.includes(vv.name.split('.').slice(-1)[0]));
              if (firstShowable) {
                em.setThumbnail({ url: firstShowable.url });
              }
            }
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
          if (cfg.embedColor && typeof cfg.embedColor === 'string' && cfg.embedColor.length >= 6 && cfg.embedColor.length < 8) {
            const colorThis = cfg.embedColor.split('#').join('');
            em.setColor(parseInt(colorThis, 16));
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
            } else if (map.has('REASON') && map.get('REASON').length > 0) {
              em.setFields([
                {
                  inline: false,
                  name: 'Reason',
                  value: map.get('REASON'),
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
        if (!msgs.has(chId)) {
          msgs.set(chId, new Array<discord.Message.OutgoingMessageOptions>());
        }
        const _chan = msgs.get(chId);
        if (_chan) {
          _chan.push({
            embed: em,
          });
          msgs.set(chId, _chan);
        }
      });
    }
  }
  return msgs;
}

export function combineMessages(
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
      if (!(op.embed instanceof discord.Embed) && (typeof op.content !== 'string' || op.content === '')) {
        return;
      }
      if (op.embed instanceof discord.Embed) {
        if (typeof op.content === 'string') {
          op.content = undefined;
        }
        newarr.push(op);
      } else if ((Array.isArray(op.attachments) && op.attachments.length > 0)) {
        newarr.push(op);
      } else {
        contents += `${op.content}\n`;
      }
    });
    if (contents !== '' && contents.length >= 1990) {
      // const lines = contents.split('\n');
      let lines: Array<string>;
      if (contents.includes('```')) {
        let start: number | undefined;
        const newArr = [];
        const thisSplit = contents.split('\n');
        for (let i = 0; i < thisSplit.length; i++) {
          const thisLine = thisSplit[i];
          if (!thisLine.includes('```')) {
            // no codeblock
            if (start === undefined) {
              newArr.push(thisLine);
            }
          } else {
            // found a codeblock
            if (typeof start === 'number' && i > start) {
              // we were parsing a codeblock!
              const slice = thisSplit.slice(start, i + 1);
              newArr.push(slice.join('\n'));
              start = undefined;
              continue;
            }
            start = i;
          }
        }
        lines = newArr.filter(() => true); // new array instead of a reference
      } else {
        lines = contents.split('\n');
      }
      // lines = lines.slice(0, lines.length - 1);
      let accum = [];
      for (let i = 0; i < lines.length; i += 1) {
        const currl = (accum.join('\n') + lines[i]).length;
        if (currl > 1985 && i !== lines.length - 1) {
          let thism = accum.join('\n');
          thism += '\n';
          newarr.push({ content: thism });
          accum = [];
        } else if (i === lines.length - 1) {
          if (currl < 1985) {
            accum.push(lines[i]);
          }

          let thism = accum.join('\n');
          thism += '\n';
          newarr.push({ content: thism });
          accum = [];
          if (currl >= 1985) {
            newarr.push({ content: `\n${lines[i]}\n` });
          }
        }
        if (i !== lines.length - 1) {
          accum.push(lines[i]);
        }
      }
    } else if (contents.length > 0) {
      newarr.push({ content: contents });
    }
    if (newarr.length === 0) {
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
    const messages = new Map<string, Array<discord.Message.OutgoingMessageOptions>>();
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
        if (utils.isIgnoredActor(qev.auditLogEntry.userId)) {
          continue;
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
      if (keys.length === 0) {
        continue;
      }
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

      const messagesTemp = await getMessages(chansTemp, obj);

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
    // if (utils.isDebug()) {
    // }
    // add to queue!
    for (const [chId, opts] of messages) {
      queue.addToQueue(chId, opts);
    }
    // messages = combineMessages(messages);
    // await sendInLogChannel(messages);
  } catch (e) {
    await utils2.logError(e);
    logDebug('BOT_ERROR', new Map<string, any>([
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
      if (utils.isIgnoredActor(log.userId)) {
        return;
      } if (conf.config.modules.logging.ignores.extendUsersToAuditLogs === true && utils.isIgnoredUser(log.userId)) {
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
    if (keys.length === 0) {
      return;
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
      let messages = await getMessages(chans, obj);
      messages = combineMessages(messages);
      await sendInLogChannel(messages, true, conf.globalConfig.masterWebhook);
      return;
    }

    const chans = await parseChannelsData(obj);
    const messages = await getMessages(chans, obj);
    // add to queue
    for (const [chId, opts] of messages) {
      queue.addToQueue(chId, opts);
    }
    // messages = combineMessages(messages);

    // await sendInLogChannel(messages);
  } catch (e) {
    await utils2.logError(e);
    logDebug('BOT_ERROR', new Map<string, any>([
      ['ERROR', `Error at logging.handleEvent.${eventName}\n${e.stack}`],
    ]),
             id);
  }
}
