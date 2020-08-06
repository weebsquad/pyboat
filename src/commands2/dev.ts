import * as conf from '../config';
import * as utils from '../lib/utils';
import * as commands2 from '../lib/commands2';
import * as routing from '../lib/eventHandler/routing';
import * as loggingEvents from '../modules/logging/tracking';
import { logCustom } from '../modules/logging/events/custom';
import * as constants from '../constants/constants';

const config = conf.config;
const F = discord.command.filters;
const kv = new pylon.KVNamespace('commands_dev');

export const _groupOptions = {
  additionalPrefixes: ['p/'],
  description: 'Dev commands',
  filters: F.custom(
    (message) => conf.isGlobalAdmin(message.member.user.id),
    'Must be bot global admin'
  )
};

const optsGroup = commands2.getOpts(_groupOptions)
export const cmdGroup = new discord.command.CommandGroup(optsGroup);

let optsEval = commands2.getOpts(_groupOptions)
optsEval.defaultPrefix = '';
optsEval.additionalPrefixes = [];
optsEval.filters = F.silent(
  F.custom(
    (message) => conf.isGlobalAdmin(message.member.user.id),
    'Must be bot global admin'
  )
);

export const cmdGroupEval = new discord.command.CommandGroup(optsEval);



cmdGroupEval.raw(
  { name: '$', aliases: ['p/eval'], onError: function() {} },
  async (msg) => {
    if (msg.content.length < 4 || !msg.content.includes(' '))
      throw new TypeError('No eval argument specified');
    let code = msg.content
      .split(' ')
      .splice(1)
      .join(' ');
    if (code === null || code.length < 3)
      throw new TypeError('No eval argument specified');
    const AsyncFunction = Object.getPrototypeOf(async function() {})
      .constructor;
    const fakeConsole = new utils.FakeConsole(await msg.getChannel());
    const _args = ['console', 'msg', 'discord', 'pylon', 'fetch'];
    try {
      const func = new AsyncFunction(..._args, code);

      await func(fakeConsole, msg, discord, pylon, fetch);
    } catch (e) {
      fakeConsole.log(e);
    }
  }
);
export const falseupdate = discord.command.handler(
  (ctx) => ({ member: ctx.guildMember() }),
  async (msg, { member }) => {
    await member.edit({
      nick: typeof member.nick === 'string' ? member.nick : undefined,
      roles: member.roles,
      //mute: false,
      //deaf: false
      channelId: null
    });
    await msg.reply('done');
  }
);

export const update = discord.command.rawHandler(
    async (msg) => {
      const req = await fetch('https://pylon.bot/');
      console.log(req);
      await msg.reply('done');
    }
  );

const test = cmdGroup.subcommand('test', (sub) => {
  /*sub.raw('queue', async (m) => {
    const kve = new pylon.KVNamespace('loggingQueue');
    let q = await getKvPayloads('GUILD_UPDATE', '1');
    if (Array.isArray(q) && typeof q[0].getAuditLogs === 'function') {
      await m.reply({ content: 'Success!' });
    } else {
      await m.reply({ content: 'Fail' });
    }
  });*/
  sub.raw('type', async (m) => {
    console.log(m.member);
    await m.reply({ content: '' + typeof m });
  });
  sub.raw('timeouts', async (m) => {
    setTimeout(function() {
      console.log('timeout 1/4 (2000ms) triggered');
      m.reply('timeout 1/4 (2000ms) triggered');
    }, 2000);
    setTimeout(function() {
      console.log('timeout 2/4 (5000ms) triggered');
      m.reply('timeout 2/4 (5000ms) triggered');
    }, 5000);
    setTimeout(function() {
      console.log('timeout 3/4 (15000ms) triggered');
      m.reply('timeout 3/4 (15000ms) triggered');
    }, 15000);
    setTimeout(function() {
      console.log('timeout 4/4 (60000ms) triggered');
      m.reply('timeout 4/4 (60000ms) triggered');
    }, 60000);
    await m.reply('timeout set!');
  });
  sub.raw('error', async (m) => {
    throw new Error('testing pls ignore');
  });
  sub.raw('started', async (m) => {
    logCustom('BOT_STARTED');
    await m.reply('done');
  });
  sub.raw('queueenabled', async (m) => {
    let isQ = routing.isQueueEnabled();
    await m.reply({ content: '' + isQ });
  });
  sub.raw('embed', async (m) => {
    let embed = new discord.Embed();
    embed.setDescription('does this even look good');
    let txt = '';
    for (var i = 0; i < 1900; i+=1) {
      txt += Math.floor(Math.random() * 10).toString();
    }
    //txt = '.' + '\n'.repeat(1000) + '.';
    embed.setFooter({ text: txt });
    embed.setTimestamp(new Date().toISOString());

    await m.reply({ embed: embed });
  });
  sub.raw('guildcreate', async (m) => {
    await loggingEvents.OnGuildCreate(
      utils.composeSnowflake(),
      m.guildId,
      await m.getGuild()
    );
    await m.reply('done');
  });
  sub.raw('userupdate', async (m) => {
    await loggingEvents.OnUserUpdate(
      utils.composeSnowflake(),
      m.guildId,
      m.author
    );
    await m.reply('done');
  });
  sub.raw('guildintegrations', async (m) => {
    await loggingEvents.OnGuildIntegrationsUpdate(
      utils.composeSnowflake(),
      m.guildId,
      { guildId: m.guildId }
    );
    await m.reply('done');
  });
  sub.raw('join', async (m) => {
    let ch = await discord.getChannel('691752063134203974');
    if (!(ch instanceof discord.GuildVoiceChannel)) return;
    await ch.voiceConnect();
    await m.reply('done');
  });
  sub.raw('perms', async (m) => {
    let permsVal = <any>'17179869186';
    permsVal = m.member.permissions;
    let p = new utils.Permissions(permsVal);
    let mp = p.serialize();
    for (var k in mp) {
      if (mp[k] === false) delete mp[k];
    }
    await m.reply(
      'Test: `' + permsVal + 'n`\n```json\n' + JSON.stringify(mp) + '\n```'
    );
  });
  sub.raw('massEvents', async (m) => {
    let count = 30;
    let event = 'MESSAGE_DELETE';
    let args = [
      {
        id: m.id,
        channelId: m.channelId,
        guildId: m.guildId
      },
      m
    ];
    let cc = 0;
    //await pylon.requestCpuBurst(async function() {
    for (var i = 0; i < count; i+=1) {
      routing.OnEvent(
        'MESSAGE_DELETE',
        utils.composeSnowflake(new Date().getTime()),
        ...args
      );
      await sleep(30);
      cc+=1;
    }
    //}, 300);
    await m.reply('sent ' + cc + ' ' + event + ' events!');
  });
});

export const clearkv = discord.command.handler(
  (ctx) => ({ kv: ctx.string() }),
  async (msg, { kv }) => {
    const kve = new pylon.KVNamespace(kv);
    await kve.clear();
    await msg.reply('done');
  }
);

export const listkv = discord.command.handler(
  (ctx) => ({ kv: ctx.string() }),
  async (msg, { kv }) => {
    const kve = new pylon.KVNamespace(kv);
    let items = await kve.items();
    await msg.reply('```json\n' + JSON.stringify(items) + '\n```');
  }
);

export const getemoji = discord.command.handler(
  (ctx) => ({ emj: ctx.string() }),
  async (msg, { emj }) => {
    let guild = await msg.getGuild();
    let emoji = await guild.getEmoji(emj);
    await msg.reply('```\n' + JSON.stringify(emoji) + '\n```');
  }
);
