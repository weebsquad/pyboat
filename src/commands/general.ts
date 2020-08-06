/* eslint-disable */
import * as utils from '../lib/utils';
import {
  Command,
  CommandArgument,
  CommandData,
  CommandArgumentUser,
  ResolvedCommandArgument,
  commands,
} from '../lib/commands';

export function InitializeCommands() {
  const _c = [];
  const Ping = new Command('ping', 'Useless command', 1);
  Ping.Execute = async function (m: CommandData) {
    await m.Message.reply('Pong!');
  };
  Ping.Aliases = ['pong'];
  _c.push(Ping);

  const Help = new Command('help', 'Show bot commands', 0);
  Help.Execute = async function (m: CommandData) {
    let text = '**< COMMANDS >**\n\n';
    const commandsArray = Object.values(commands);
    const commandCategories = {};
    // console.log(commandsArray);
    commandsArray.sort((a, b) => {
      if (a.Category > b.Category) {
        return 1;
      }
      if (b.Category > a.Category) {
        return -1;
      }
      return 0;
    });
    commandsArray.forEach((el) => {
      if (!Array.isArray(commandCategories[el.Category])) {
        commandCategories[el.Category] = [];
      }
      commandCategories[el.Category].push(el);
    });
    for (let key in commandCategories) {
      const obj = commandCategories[key];
      obj.sort((a, b) => {
        if (a.Name > b.Name) {
          return 1;
        }
        if (b.Name > a.Name) {
          return -1;
        }
        return 0;
      });
    }
    const commandsFinal = [];

    let maxLengthCat = 0;
    for (let key in commandCategories) {
      const obj = commandCategories[key];

      for (let i = 0; i < obj.length; i += 1) {
        commandsFinal.push(obj[i]);
        if (obj[i].Category.length > maxLengthCat) {
          maxLengthCat = obj[i].Category.length;
        }
      }
    }

    let currCat = '';
    for (let i = 0; i < commandsFinal.length; i += 1) {
      const obj = commandsFinal[i];
      if (obj.Authorization > m.UserAuthorization || obj.Hidden == true) {
        continue;
      }
      const usage = `${obj.Usage} `;
      const maxcategorylength = 0;
      let prefix: any;
      if (Array.isArray(m.ConfigData.modules.commands.prefix)) {
        prefix = m.ConfigData.modules.commands.prefix[0];
      } else {
        prefix = m.ConfigData.modules.commands.prefix;
      }

      // text += `\n**[**${obj.Category}**]** ${spacesThis}**${prefix}${obj.Name}** ${usage}- __${obj.Description}__`;
      if (obj.Category !== currCat) {
        if (currCat !== '') {
          text += '\n\n';
        }
        text += `**>>** __${obj.Category.toUpperCase()}__ **<<**`;
      }
      text += `\n **${prefix}${obj.Name}** ${usage}- __${obj.Description}__`;
      currCat = obj.Category;
    }
    await m.Message.reply(text);
  };
  Help.ConfigModuleAccess = ['modules.commands'];
  Help.Aliases = ['halp', 'cmds', 'commands'];
  // Help.Hidden = true;
  _c.push(Help);

  const UserInfo = new Command('userinfo', 'Gets data of a user ID', 0);
  UserInfo.Execute = async function (m: CommandData) {
    let usr: any = m.Author;
    if (m.ResolvedArguments[0]) {
      usr = m.ResolvedArguments[0].Data.User;
    }
    const embed = new discord.Embed();
    embed.setTitle(usr.getTag()).setColor(0x00ff00);
    embed.setDescription('User Information');
    embed.setThumbnail({ url: usr.getAvatarUrl() });
    embed.addField({
      name: 'User ID',
      value: usr.id,
      inline: false,
    });
    embed.setTimestamp(new Date().toISOString());
    await m.Message.reply({ content: '', embed });
  };
  UserInfo.Aliases = ['user'];
  UserInfo.Arguments.push(new CommandArgument('User', 1, false));
  _c.push(UserInfo);

  return _c;
}
