import * as utils from '../lib/utils';
import {
  Command,
  CommandArgument,
  CommandData,
  CommandArgumentUser,
  ResolvedCommandArgument,
  commands
} from '../lib/commands';

export function InitializeCommands() {
  let _c = [];
  let Ping = new Command('ping', 'Useless command', 1);
  Ping.Execute = async function(m: CommandData) {
    await m.Message.reply('Pong!');
  };
  Ping.Aliases = ['pong'];
  _c.push(Ping);

  let Help = new Command('help', 'Show bot commands', 0);
  Help.Execute = async function(m: CommandData) {
    let text = '**< COMMANDS >**\n\n';
    let commandsArray = Object.values(commands);
    let commandCategories = {};
    //console.log(commandsArray);
    commandsArray.sort(function(a, b) {
      if (a.Category > b.Category) {
        return 1;
      }
      if (b.Category > a.Category) {
        return -1;
      }
      return 0;
    });
    commandsArray.forEach(function(el) {
      if (!Array.isArray(commandCategories[el.Category]))
        commandCategories[el.Category] = new Array();
      commandCategories[el.Category].push(el);
    });
    for (var key in commandCategories) {
      let obj = commandCategories[key];
      obj.sort(function(a, b) {
        if (a.Name > b.Name) {
          return 1;
        }
        if (b.Name > a.Name) {
          return -1;
        }
        return 0;
      });
    }
    let commandsFinal = new Array();

    let maxLengthCat = 0;
    for (var key in commandCategories) {
      let obj = commandCategories[key];

      for (var i = 0; i < obj.length; i++) {
        commandsFinal.push(obj[i]);
        if (obj[i].Category.length > maxLengthCat)
          maxLengthCat = obj[i].Category.length;
      }
    }

    let currCat = '';
    for (var i = 0; i < commandsFinal.length; i++) {
      let obj = commandsFinal[i];
      if (obj.Authorization > m.UserAuthorization || obj.Hidden == true)
        continue;
      let usage = obj.Usage + ' ';
      let maxcategorylength = 0;
      let prefix;
      if (Array.isArray(m.ConfigData.modules.commands.prefix)) {
        prefix = m.ConfigData.modules.commands.prefix[0];
      } else {
        prefix = m.ConfigData.modules.commands.prefix;
      }

      //text += `\n**[**${obj.Category}**]** ${spacesThis}**${prefix}${obj.Name}** ${usage}- __${obj.Description}__`;
      if (obj.Category !== currCat) {
        if (currCat !== '') text += '\n\n';
        text += `**>>** __${obj.Category.toUpperCase()}__ **<<**`;
      }
      text += `\n **${prefix}${obj.Name}** ${usage}- __${obj.Description}__`;
      currCat = obj.Category;
    }
    await m.Message.reply(text);
  };
  Help.ConfigModuleAccess = ['modules.commands'];
  Help.Aliases = ['halp', 'cmds', 'commands'];
  //Help.Hidden = true;
  _c.push(Help);

  let UserInfo = new Command('userinfo', 'Gets data of a user ID', 0);
  UserInfo.Execute = async function(m: CommandData) {
    let usr = m.Author;
    if (m.ResolvedArguments[0])
      usr = m.ResolvedArguments[0].Data.User as discord.User;
    const embed = new discord.Embed();
    embed.setTitle(usr.getTag()).setColor(0x00ff00);
    embed.setDescription('User Information');
    embed.setThumbnail({ url: usr.getAvatarUrl() });
    embed.addField({
      name: 'User ID',
      value: usr.id,
      inline: false
    });
    embed.setTimestamp(new Date().toISOString());
    await m.Message.reply({ content: '', embed: embed });
  };
  UserInfo.Aliases = ['user'];
  UserInfo.Arguments.push(new CommandArgument('User', 1, false));
  _c.push(UserInfo);

  return _c;
}
