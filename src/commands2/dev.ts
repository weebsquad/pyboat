import { globalConfig, InitializeConfig, config } from '../config';
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import * as infractions from '../modules/infractions';
import * as starboard from '../modules/starboard';
import * as censor from '../modules/censor';
import * as antiSpam from '../modules/antiSpam';
import * as admin from '../modules/admin';
import * as pools from '../lib/storagePools';
import * as ratelimit from '../lib/eventHandler/ratelimit';
import * as queue from '../lib/eventHandler/queue';
import * as crons from '../lib/crons';
import { handleEvent } from '../modules/logging/main';
import { AL_OnMessageDelete } from '../modules/logging/events/messageDelete';

// const F = discord.command.filters;
// const kv = new pylon.KVNamespace('commands_dev');
export function InitializeCommands() {
  const _groupOptions = {
    description: 'Dev commands',
    defaultPrefix: globalConfig.devPrefix,
    filters: c2.getFilters(null, 0, false, true),
    mentionPrefix: false,
  };

  const optsGroup = c2.getOpts(_groupOptions);
  const cmdGroup = new discord.command.CommandGroup(optsGroup);

  /* const optsEval = c2.getOpts(_groupOptions);
  optsEval.defaultPrefix = '';
  optsEval.additionalPrefixes = [];
  optsEval.mentionPrefix = false;
  optsEval.filters = c2.getFilters(null, 0, false, true); */

  const optsOverrides = c2.getOpts(_groupOptions);
  optsOverrides.filters = c2.getFilters(null, 0, false, true);
  const cmdGroupOverrides = new discord.command.CommandGroup(optsOverrides);

  cmdGroupOverrides.on(
    'override',
    (ctx) => ({ txt: ctx.textOptional() }),
    async (msg, { txt }) => {
      const res: any = await msg.reply(async () => {
        const hasActiveOv = await utils.isGAOverride(msg.author.id);
        if (typeof (txt) === 'string' && txt.length > 0) {
          if (hasActiveOv) {
            if (['disable', 'delete', 'remove'].includes(txt.toLowerCase())) {
              const rtv = await utils.deleteGaOverride(msg.author.id);
              if (rtv !== true) {
                return `Error while deleting override: ${rtv}`;
              }
              return `${discord.decor.Emojis.WHITE_CHECK_MARK} Override disabled!`;
            }
          } else {
            const msd = utils.timeArgumentToMs(txt);
            if (msd !== 0) {
              if (msd < 60 * 1000 || msd > 7 * 24 * 60 * 60 * 1000) {
                return 'time to override must be at least 1 minute and at most 7 days';
              }
              const retv = await utils.insertGaOverride(msg.author.id, msd);
              if (retv !== true) {
                return `Error while adding override: ${retv}`;
              }
              return `${discord.decor.Emojis.WHITE_CHECK_MARK} Override added!`;
            }
          }
        }
        if (globalConfig.masterGuild === msg.guildId) {
          return `${discord.decor.Emojis.WHITE_CHECK_MARK} You have an override active in this guild permanently due to it being the control guild.`;
        }
        const tmleft = hasActiveOv === true ? await utils.getOverrideTimeLeft(msg.author.id) : 0;
        const parsedTimeLeft = utils.getLongAgoFormat(tmleft, 2, false, 'second');
        let txtR = hasActiveOv === true ? `${discord.decor.Emojis.WHITE_CHECK_MARK} You currently have an override active which expires in ${parsedTimeLeft}` : `${discord.decor.Emojis.X} You do not have any overrides active in this guild.`;
        txtR += hasActiveOv === true ? `\nTo revoke this override, please run the command \`${globalConfig.devPrefix}override disable\`` : `\nTo active an override, please run the command \`${globalConfig.devPrefix}override <time>\``;
        return txtR;
      });
      admin.saveMessage(res);
    },
  );

  // const cmdGroupEval = new discord.command.CommandGroup(optsEval);
  cmdGroup.raw(
    { name: 'eval',
      onError(e: any) {
        return e;
      } },
    async (msg) => {
      if (msg.content.length < 4 || !msg.content.includes(' ')) {
        throw new TypeError('No eval argument specified');
      }
      const code = msg.content
        .split(' ')
        .splice(1)
        .join(' ');
      if (code === null || code.length < 3) {
        throw new TypeError('No eval argument specified');
      }
      const guild = await msg.getGuild();
      // eslint-disable-next-line
    const AsyncFunction = Object.getPrototypeOf(async () => {})
        .constructor;
      const fakeConsole = new utils.FakeConsole(await msg.getChannel());
      const _args = ['console', 'msg', 'discord', 'pylon', 'fetch', 'guild'];
      try {
        const func = new AsyncFunction(..._args, code);

        await func(fakeConsole, msg, discord, pylon, fetch, guild);
      } catch (e) {
        fakeConsole.log(e);
      }
    },
  );
  cmdGroup.on(
    'falseupdate',
    (ctx) => ({ member: ctx.guildMember() }),
    async (msg, { member }) => {
      await member.edit({
        nick: typeof member.nick === 'string' ? member.nick : undefined,
        roles: member.roles,
        // mute: false,
        // deaf: false
        channelId: null,
      });
      const res: any = await msg.reply('done');
      admin.saveMessage(res);
    },
  );
  cmdGroup.raw(
    'reload',
    async (msg) => {
      await InitializeConfig(true);
      const res: any = await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} reloaded the servers config!`);
      admin.saveMessage(res);
    },
  );
  cmdGroup.subcommand('test', (sub) => {
    sub.on(
      'override',
      (ctx) => ({ level: ctx.number(), string: ctx.string() }),
      async (m, { string, level }) => {
        const res: any = await m.reply(async () => {
          const newlvl = c2.checkOverrides(level, string);
          if (newlvl.level === level) {
            return { content: 'Nothing changed.' };
          } if (newlvl.level === -1) {
            return { content: `\`${string}\` is disabled.` };
          }
          return { content: `Overriden level of \`${string}\`**[**${level}**]** >> **${c2.checkOverrides(level, string)}**` };
        });
        admin.saveMessage(res);
      },
    );

    sub.raw(
      'error', async () => {
        throw new Error('testing pls ignore');
      },
    );

    sub.raw(
      'kvmkeys', async (m) => {
        const keys = await utils.KVManager.listKeys();
        console.log(keys);
        const res: any = await m.reply(`Found ${keys.length} keys!`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'user', async (m) => {
        const resUsr = await utils.getUser(m.author.id, true);
        const flags = new utils.UserFlags(resUsr.public_flags);
        const res: any = await m.reply(`\`\`\`json\n${JSON.stringify(flags.serialize(), null, 2)}\n\`\`\``);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'clearkvm', async (m) => {
        const dt = Date.now();
        await utils.KVManager.clear();
        const res: any = await m.reply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'runcleans', async (m) => {
        const dt = Date.now();
        await Promise.all(pools.InitializedPools.map(async (pool) => {
          await pool.clean();
        }));
        const res: any = await m.reply(`Done (${Date.now() - dt}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.on('cron',
           (ctx) => ({ key: ctx.string() }),
           async (m, { key }) => {
             const dt = Date.now();
             await crons.onCron(key);
             const res: any = await m.reply(`Done (${Date.now() - dt}ms)`);
             admin.saveMessage(res);
           });
    sub.on('getkvm',
           (ctx) => ({ key: ctx.string() }),
           async (m, { key }) => {
             const dt = Date.now();
             const keys = await utils.KVManager.get(key);
             console.log(keys);
             const res: any = await m.reply(`Done, check console (${Date.now() - dt}ms)`);
             admin.saveMessage(res);
           });
    sub.raw(
      'embed', async (m) => {
        const embed = new discord.Embed();
        embed.setDescription('does this even look good');
        let txt = '';
        for (let i = 0; i < 1900; i += 1) {
          txt += Math.floor(Math.random() * 10).toString();
        }
        // txt = '.' + '\n'.repeat(1000) + '.';
        embed.setFooter({ text: txt });
        embed.setTimestamp(new Date().toISOString());

        const res: any = await m.reply({ embed });
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'channelow', async (m) => {
        await admin.storeChannelData();
      },
    );
    sub.raw(
      'logqueue', async (m) => {
        const ev = { channelId: m.channelId, guildId: m.guildId, id: m.id } as discord.Event.IMessageDelete;
        const count = 50;
        for (let i = 0; i < count; i++) {
          AL_OnMessageDelete(utils.composeSnowflake(), m.guildId, {}, ev, m);
        }
        const res: any = await m.reply(`Done sending ${count} message delete logs`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'mychannelow', async (m) => {
        await admin.storeChannelData();
        const res = await admin.getStoredUserOverwrites(m.author.id);
        console.log(res);
      },
    );

    sub.raw(
      'clearsb', async (m) => {
        const now = Date.now();
        await starboard.clearData();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );

    sub.raw(
      'clearcensor', async (m) => {
        const now = Date.now();
        await censor.clean();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'asclear', async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('antiSpam').clear();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'asget', async (m) => {
        const now = Date.now();
        const res1 = await antiSpam.pools.getAll();
        const res: any = await m.reply(`Done - ${res1.length} - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'getinfs', async (m) => {
        const now = Date.now();
        const infs = await infractions.getInfractions();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
        console.log(infs);
      },
    );
    sub.raw(
      'clearinfs', async (m) => {
        await infractions.clearInfractions();
        const res: any = await m.reply('Done');
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'modules', async (m) => {
        const res: any = await m.reply(async () => {
          const mods = [];
          for (const key in config.modules) {
            if (typeof config.modules[key] === 'object' && typeof config.modules[key].enabled === 'boolean') {
              if (config.modules[key].enabled === true) {
                mods.push(key);
              }
            }
          }
          if (mods.length === 0) {
            return 'No modules enabled!';
          }
          return `Modules enabled:\n\`${mods.join(', ')}\``;
        });
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'tracking', async (m) => {
        const now = Date.now();
        const res1 = await new pylon.KVNamespace('admin').items();
        const poolsL = await admin.adminPool.getAll();
        let txt = '';
        let c = 0;
        res1.map((item: any) => {
          c++;
          txt += `\n${c} => ${item.value.length}`;
        });
        const res: any = await m.reply(`Done - **${res1.length} key(s)** // **${poolsL.length} total items** - (Took ${Date.now() - now}ms)\n\n\`\`\`\n${txt}\n\`\`\``);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'ratelimit', async (m) => {
        const now = Date.now();
        const res1 = ratelimit.poolGlob;
        const res: any = await m.reply(`Done - **${res1.length} item(s)** - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'queue', async (m) => {
        const now = Date.now();
        const res1 = queue.queue;
        const res: any = await m.reply(`Done - **${res1.length} item(s)** - (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'cleartracking', async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('admin').clear();
        const res: any = await m.reply(`Done (Took ${Date.now() - now}ms)`);
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'join', async (m) => {
        const ch = await discord.getChannel('691752063134203974');
        if (!(ch instanceof discord.GuildVoiceChannel)) {
          return;
        }
        await ch.voiceConnect();
        const res: any = await m.reply('done');
        admin.saveMessage(res);
      },
    );
    sub.raw(
      'perms', async (m) => {
        let permsVal = <any>'17179869186';
        permsVal = m.member.permissions;
        const p = new utils.Permissions(permsVal);
        const mp = p.serialize();
        for (const k in mp) {
          if (mp[k] === false) {
            delete mp[k];
          }
        }
        const res: any = await m.reply(
          `Test: \`${permsVal}n\`\n\`\`\`json\n${JSON.stringify(mp)}\n\`\`\``,
        );
        admin.saveMessage(res);
      },
    );
  });

  cmdGroup.on(
    'clearkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      await kve.clear();
      const res: any = await msg.reply('done');
      admin.saveMessage(res);
    },
  );

  cmdGroup.on(
    'listkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      const items = await kve.items();
      const res: any = await msg.reply(`\`\`\`json\n${JSON.stringify(items)}\n\`\`\``);
      admin.saveMessage(res);
    },
  );

  cmdGroup.on(
    'getemoji',
    (ctx) => ({ emj: ctx.string() }),
    async (msg, { emj }) => {
      const guild = await msg.getGuild();
      const emoji = await guild.getEmoji(emj);
      const res: any = await msg.reply(`\`\`\`\n${JSON.stringify(emoji)}\n\`\`\``);
      admin.saveMessage(res);
    },
  );
  return [cmdGroup, cmdGroupOverrides];
}
