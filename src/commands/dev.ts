import * as utils from '../lib/utils';
import * as constants from '../constants/constants';
import { bigInt } from '../lib/bigint';

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

  const Test = new Command('testcom', 'Testing command!', 3);
  Test.Execute = async function (m: CommandData) {
    const switcher = m.ResolvedArguments[0].Data;
    if (switcher === 'snowflake') {
      const now = new Date();
      // now.setFullYear(now.getFullYear() + 100);
      let baseId;
      try {
        baseId = m.ResolvedArguments[1].Data;
      } catch (e) {}
      const normalTs = utils.getSnowflakeDate(baseId);
      /* let bi = bigInt(baseId, 10, undefined, undefined);
      let diff = bi.subtract(parseInt(baseId)).toString();
      let calculatedTs =
        Math.floor(parseInt(baseId) / 4194304) + constants.Epoch; */
      await m.Message.reply(
        `\`\`\`\nID: ${baseId}\nTimestamp: ${new Date(normalTs)}\n\`\`\``,
      );
    } else if (switcher === 'delrole') {
      let baseId;
      try {
        baseId = m.ResolvedArguments[1].Data;
      } catch (e) {}
      const guildRole = await m.Guild.getRole(baseId);
      if (guildRole === null) {
        await m.Message.reply('invalid role');
        return;
      }
      console.log(guildRole);
      await guildRole.delete();
      await m.Message.reply('role deleted');
    } else if (switcher === 'giverole') {
      let baseId;
      try {
        baseId = m.ResolvedArguments[1].Data;
      } catch (e) {}
      const guildRole = await m.Guild.getRole(baseId);
      if (guildRole === null) {
        await m.Message.reply('invalid role');
        return;
      }
      console.log(guildRole);
      await m.AuthorGuild.addRole(baseId);
      await m.Message.reply('role added');
    } else {
      console.log(switcher);
      await m.Message.reply('**Test Command**: Invalid switcher used');
    }
  };
  Test.Hidden = true;
  Test.Aliases = ['tc', 'test'];
  // Test.Parameters.push('test1', 'test2');
  Test.Arguments.push(
    new CommandArgument('Text', 1, true),
    new CommandArgument('Text', 2, false),
  );
  _c.push(Test);

  return _c;
}
