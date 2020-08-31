import { globalConfig, InitializeConfig } from '../config';
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import * as routing from '../lib/eventHandler/routing';
import * as loggingEvents from '../modules/logging/tracking';
import { logDebug } from '../modules/logging/events/custom';
import * as infractions from '../modules/infractions';
import * as utilities from '../modules/utilities';
import * as starboard from '../modules/starboard';
import * as censor from '../modules/censor';
import * as antiSpam from '../modules/antiSpam';
import * as admin from '../modules/admin';
import * as pools from '../lib/storagePools';

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
      const hasActiveOv = await utils.isGAOverride(msg.author.id);
      if (typeof (txt) === 'string' && txt.length > 0) {
        if (hasActiveOv) {
          if (['disable', 'delete', 'remove'].includes(txt.toLowerCase())) {
            const rtv = await utils.deleteGaOverride(msg.author.id);
            if (rtv !== true) {
              await msg.reply(`Error while deleting override: ${rtv}`);
            } else {
              await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} Override disabled!`);
            }
            return;
          }
        } else {
          const msd = utils.timeArgumentToMs(txt);
          if (msd !== 0) {
            if (msd < 60 * 1000 || msd > 7 * 24 * 60 * 60 * 1000) {
              await msg.reply('time to override must be at least 1 minute and at most 7 days');
              return;
            }
            const retv = await utils.insertGaOverride(msg.author.id, msd);
            if (retv !== true) {
              await msg.reply(`Error while adding override: ${retv}`);
            } else {
              await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} Override added!`);
              return;
            }
          }
        }
      }
      if (globalConfig.masterGuild === msg.guildId) {
        await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} You have an override active in this guild permanently due to it being the control guild.`);
        return;
      }
      const tmleft = hasActiveOv === true ? await utils.getOverrideTimeLeft(msg.author.id) : 0;
      const parsedTimeLeft = utils.getLongAgoFormat(tmleft, 2, false, 'second');
      let txtR = hasActiveOv === true ? `${discord.decor.Emojis.WHITE_CHECK_MARK} You currently have an override active which expires in ${parsedTimeLeft}` : `${discord.decor.Emojis.X} You do not have any overrides active in this guild.`;
      txtR += hasActiveOv === true ? `\nTo revoke this override, please run the command \`${globalConfig.devPrefix}override disable\`` : `\nTo active an override, please run the command \`${globalConfig.devPrefix}override <time>\``;
      await msg.reply(txtR);
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
      await msg.reply('done');
    },
  );
  cmdGroup.raw(
    'reload',
    async (msg) => {
      await InitializeConfig(true);
      await msg.reply(`${discord.decor.Emojis.WHITE_CHECK_MARK} reloaded the servers config!`);
    },
  );
  cmdGroup.subcommand('test', (sub) => {
    sub.on(
      'override',
      (ctx) => ({ level: ctx.number(), string: ctx.string() }),
      async (m, { string, level }) => {
        const newlvl = c2.checkOverrides(level, string);
        if (newlvl === level) {
          await m.reply('Nothing changed.');
        } else if (newlvl === -1) {
          await m.reply(`\`${string}\` is disabled.`);
        } else {
          await m.reply({ content: `Overriden level of \`${string}\`**[**${level}**]** >> **${c2.checkOverrides(level, string)}**` });
        }
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
        await m.reply(`Found ${keys.length} keys!`);
      },
    );
    sub.raw(
      'clearkvm', async (m) => {
        const dt = Date.now();
        await utils.KVManager.clear();
        await m.reply(`Done (${Date.now() - dt}ms)`);
      },
    );
    sub.raw(
      'runcleans', async (m) => {
        const dt = Date.now();
        await Promise.all(pools.InitializedPools.map(async (pool) => {
          await pool.clean();
        }));
        await m.reply(`Done (${Date.now() - dt}ms)`);
      },
    );
    sub.on('getkvm',
           (ctx) => ({ key: ctx.string() }),
           async (m, { key }) => {
             const dt = Date.now();
             const keys = await utils.KVManager.get(key);
             console.log(keys);
             await m.reply(`Done, check console (${Date.now() - dt}ms)`);
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

        await m.reply({ embed });
      },
    );
    sub.raw(
      'channelow', async (m) => {
        await utilities.storeChannelData();
      },
    );
    sub.raw(
      'mychannelow', async (m) => {
        await utilities.storeChannelData();
        const res = await utilities.getStoredUserOverwrites(m.author.id);
        console.log(res);
      },
    );

    sub.raw(
      'clearsb', async (m) => {
        const now = Date.now();
        await starboard.clearData();
        await m.reply(`Done (Took ${Date.now() - now}ms)`);
      },
    );

    sub.raw(
      'clearcensor', async (m) => {
        const now = Date.now();
        await censor.clean();
        await m.reply(`Done (Took ${Date.now() - now}ms)`);
      },
    );
    sub.raw(
      'asclear', async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('antiSpam').clear();
        await m.reply(`Done (Took ${Date.now() - now}ms)`);
      },
    );
    sub.raw(
      'asget', async (m) => {
        const now = Date.now();
        const res = await antiSpam.pools.getAll();
        await m.reply(`Done - ${res.length} - (Took ${Date.now() - now}ms)`);
      },
    );
    sub.raw(
      'getinfs', async (m) => {
        const now = Date.now();
        const infs = await infractions.getInfractions();
        await m.reply(`Done (Took ${Date.now() - now}ms)`);
        console.log(infs);
      },
    );
    sub.raw(
      'clearinfs', async (m) => {
        await infractions.clearInfractions();
        await m.reply('Done');
      },
    );
    sub.raw(
      'tracking', async (m) => {
        const now = Date.now();
        const res = await new pylon.KVNamespace('admin').items();
        const poolsL = await admin.adminPool.getAll();
        let txt = '';
        res.map((item: any) => txt+=`\n[${item.key}] => ${item.value.length}`);
        await m.reply(`Done - **${res.length} key(s)** // **${poolsL.length} total items** - (Took ${Date.now() - now}ms)\n\n\`\`\`\n${txt}\n\`\`\``);
      },
    );
    sub.raw(
      'cleartracking', async (m) => {
        const now = Date.now();
        await new pylon.KVNamespace('admin').clear();
        await m.reply(`Done (Took ${Date.now() - now}ms)`);
      },
    );
    sub.raw(
      'join', async (m) => {
        const ch = await discord.getChannel('691752063134203974');
        if (!(ch instanceof discord.GuildVoiceChannel)) {
          return;
        }
        await ch.voiceConnect();
        await m.reply('done');
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
        await m.reply(
          `Test: \`${permsVal}n\`\n\`\`\`json\n${JSON.stringify(mp)}\n\`\`\``,
        );
      },
    );
  });

  cmdGroup.on(
    'clearkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      await kve.clear();
      await msg.reply('done');
    },
  );

  cmdGroup.on(
    'listkv',
    (ctx) => ({ kvep: ctx.string() }),
    async (msg, { kvep }) => {
      const kve = new pylon.KVNamespace(kvep);
      const items = await kve.items();
      await msg.reply(`\`\`\`json\n${JSON.stringify(items)}\n\`\`\``);
    },
  );

  cmdGroup.on(
    'getemoji',
    (ctx) => ({ emj: ctx.string() }),
    async (msg, { emj }) => {
      const guild = await msg.getGuild();
      const emoji = await guild.getEmoji(emj);
      await msg.reply(`\`\`\`\n${JSON.stringify(emoji)}\n\`\`\``);
    },
  );
  return [cmdGroup, cmdGroupOverrides];
}
