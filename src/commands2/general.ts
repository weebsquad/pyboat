/* eslint-disable no-irregular-whitespace */
import * as conf from '../config';
import * as utils from '../lib/utils';
import * as c2 from '../lib/commands2';
import * as gTranslate from '../lib/gTranslate';
import * as constants from '../constants/translation';
import * as admin from '../modules/admin';
import { SaveData } from '../modules/disabled/cur';
import { registerSlash, registerSlashGroup, registerSlashSub, interactionChannelRespond } from '../modules/commands';

const { config, Ranks } = conf;
const F = discord.command.filters;
const kv = new pylon.KVNamespace('commands_general');
export function InitializeCommands() {
  const _groupOptions = {
    description: 'General commands',
    filters: c2.getFilters('commands', Ranks.Guest),
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);

  cmdGroup.raw(
    { name: 'help', filters: c2.getFilters('commands.help', Ranks.Guest) }, async (msg) => {
      const newemb = new discord.Embed();
      newemb.setAuthor({ name: 'PyBoat' });
      newemb.setDescription('PyBoat is a rowboat clone built on top of [Pylon](https://pylon.bot)\n\nIt features several utility, moderation and general automation features.\n\n[Documentation](https://docs.pyboat.i0.tf/)\n[Homepage](https://pyboat.i0.tf)\n[Support Server](https://discord.gg/ehtaU3d)');
      newemb.setColor(0xFF0000);
      newemb.setThumbnail({ url: conf.globalConfig.botUser.getAvatarUrl() });
      const res: any = await msg.inlineReply({ allowedMentions: {}, content: '', embed: newemb });
      admin.saveMessage(res);
    },
  );
  cmdGroup.raw(
    { name: 'docs', filters: c2.getFilters('commands.docs', Ranks.Guest) }, async (msg) => {
      const res: any = await msg.inlineReply({ allowedMentions: {}, content: '<https://docs.pyboat.i0.tf/>' });
      admin.saveMessage(res);
    },
  );

  cmdGroup.raw(
    { name: 'mylevel', filters: c2.getFilters('commands.mylevel', Ranks.Guest) },
    async (msg) => {
      const res: any = await msg.inlineReply(`${msg.author.toMention()} you are bot access level **${utils.getUserAuth(msg.member)}**${utils.isGlobalAdmin(msg.author.id) ? ' and a global admin!' : ''}`);
      admin.saveMessage(res);
    },
  );

  cmdGroup.raw(
    { name: 'ping', filters: c2.getFilters('commands.ping', Ranks.Guest) },
    async (msg) => {
      const msgdiff = new Date().getTime() - utils.decomposeSnowflake(msg.id).timestamp;
      const msgd = new Date();
      const edmsg: any = await msg.inlineReply('<a:loading:735794724480483409>');
      const td = new Date().getTime() - msgd.getTime();
      await edmsg.edit(`Pong @${msgdiff}ms, sent message in ${td}ms`);
      admin.saveMessage(edmsg);
    },
  );

  cmdGroup.on(
    { name: 'nickme', filters: c2.getFilters('commands.nickme', Ranks.Owner) },
    (ctx) => ({ nick: ctx.textOptional() }),
    async (msg, { nick }) => {
      const res:any = await msg.inlineReply(async () => {
        const guild = await msg.getGuild();
        const me = await guild.getMember(discord.getBotId());
        if (!me.can(discord.Permissions.CHANGE_NICKNAME)) {
          return 'I don\'t have permissions to change my nickname!';
        }
        if (nick === me.nick) {
          return 'I already have that nickname!';
        }
        if (nick === 'invisible') {
          nick = ' ឵឵ ';
        } // invis chars
        await me.edit({ nick });
        return 'Done!';
      });
      admin.saveMessage(res);
    },
  );

  /* export const rolelb = discord.command.rawHandler(
  async (message) => {
    await message.inlineReply(async () => {
      const ms = new Date();
      const guild = await message.getGuild();
      let board = `**ROLE COUNT LEADERBOARD FOR ${guild.name}**\n\`\`\``;
      let top10homos = new Array<discord.GuildMember>();
      const sortit = function (arr: Array<discord.GuildMember>) {
        arr.sort((el1, el2) => el2.roles.length - el1.roles.length);
        return arr;
      };

      for await (const member of guild.iterMembers()) {
        if (top10homos.length === 0) {
          top10homos.push(member);
          continue;
        }

        const lowest = top10homos[top10homos.length - 1];
        if (member.roles.length > lowest.roles.length) {
          if (top10homos.length < 10) {
            top10homos.push(member);
          } else {
            top10homos[top10homos.length - 1] = member;
          }
        }
        top10homos = sortit(top10homos);
      }
      for (let i = 0; i < top10homos.length; i += 1) {
        board += `\n#${i + 1} - ${top10homos[i].user.getTag()} - ${
          top10homos[i].roles.length
        } roles`;
      }
      board += '\n```';
      return board;
    });
  },
); */

  /* export const translate = discord.command.handler(
  (ctx) => ({ lang: ctx.string(), text: ctx.text() }),
  async (message, { lang, text }) => {
    let translation = await gTranslate.translate(text, lang);
    let sourceLang = constants.languages.find(
      (e) => e.shortcode === translation.detectedSourceLanguage
    );
    let targetLang = constants.languages.find((e) => e.shortcode === lang);
    let ll = sourceLang.name ?? translation.detectedSourceLanguage;
    let targ = targetLang.name ?? lang;
    const richEmbed = new discord.Embed();
    richEmbed.setThumbnail({
      url:
        'https://icons-for-free.com/iconfiles/png/512/language+text+translate+translation+icon-1320183416086707155.png',
      height: 128,
      width: 128
    });
    richEmbed
      .setTitle(`${ll} ${discord.decor.Emojis.ARROW_RIGHT} ${targ}`)
      .setColor(0x00ff00);
    richEmbed.setDescription(translation.translatedText);
    richEmbed.setFooter({
      iconUrl: message.member.user.getAvatarUrl(),
      text: `Requested by ${message.member.user.getTag()} (${
        message.member.user.id
      })`
    });
    richEmbed.setTimestamp(new Date().toISOString());
    await message.inlineReply(async () => {
      return { embed: richEmbed };
    });
  }
); */

  return cmdGroup;
}

registerSlash(
  { name: 'help', description: 'Shows the bot\'s help explanation' },
  async (inter) => {
    await inter.respondEphemeral('PyBoat is a rowboat clone built on top of [Pylon](https://pylon.bot)\n\nIt features several utility, moderation and general automation features.\n\n[Documentation](https://docs.pyboat.i0.tf/)\n[Homepage](https://pyboat.i0.tf)\n[Support Server](https://discord.gg/ehtaU3d)');
    return false;
  }, {
    staticAck: false,
    permissions: {
      overrideableInfo: 'commands.help',
      level: Ranks.Guest,
    },
    module: 'commands',
  },
);

registerSlash(
  { name: 'docs', description: 'Shows the bot\'s documentation link' },
  async (inter) => {
    await inter.respondEphemeral('<https://docs.pyboat.i0.tf/>');
    return false;
  }, {
    staticAck: false,
    permissions: {
      overrideableInfo: 'commands.docs',
      level: Ranks.Guest,
    },
    module: 'commands',
  },
);

registerSlash(
  { name: 'mylevel', description: 'Shows your bot access level' },
  async (inter) => {
    await inter.respondEphemeral(`${inter.member.user.toMention()} you are bot access level **${utils.getUserAuth(inter.member)}**${utils.isGlobalAdmin(inter.member.user.id) ? ' and a global admin!' : ''}`);
    return false;
  }, {
    staticAck: false,
    permissions: {
      overrideableInfo: 'commands.mylevel',
      level: Ranks.Guest,
    },
    module: 'commands',
  },
);

registerSlash(
  { name: 'ping', description: 'Ping pong' },
  async (inter) => {
    const msgdiff = new Date().getTime() - utils.decomposeSnowflake(inter.id).timestamp;
    const msgd = new Date();
    const edmsg = await interactionChannelRespond(inter, '<a:loading:735794724480483409>');
    if (!edmsg) {
      return;
    }
    const td = new Date().getTime() - msgd.getTime();
    await edmsg.edit(`Pong @${msgdiff}ms, sent message in ${td}ms`);
  }, {
    staticAck: true,
    permissions: {
      overrideableInfo: 'commands.ping',
      level: Ranks.Guest,
    },
    module: 'commands',
  },
);

/*

registerSlash(
  { name: 'nickme', description: 'Changes the bot\'s nickname on the server', options: (ctx) => ({ nick: ctx.string({ required: true, description: 'The nick to change to. Use "invisible" to set the bot\'s nickname to invisible.' }) }) },
  async (inter, { nick }) => {
    const guild = await inter.getGuild();
    const me = await guild.getMember(discord.getBotId());
    if (!me.can(discord.Permissions.CHANGE_NICKNAME)) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('I don\'t have permissions to change my nickname!');
      return;
    }
    if (nick === me.nick) {
      await inter.acknowledge(false);
      await inter.respondEphemeral('I already have that nickname!');
      return;
    }
    if (nick === 'invisible') {
      nick = ' ឵឵ ';
    } // invis chars
    await inter.acknowledge(true);
    await me.edit({ nick });
    await interactionChannelRespond(inter, 'Done!');
  }, {
    permissions: {
      overrideableInfo: 'commands.nickme',
      level: Ranks.Owner,
    },
    module: 'commands',
  },
);

*/
