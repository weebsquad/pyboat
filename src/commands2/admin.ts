import { globalConfig, Ranks, guildId } from '../config';
import * as c2 from '../lib/commands2';
import { saveMessage } from '../modules/admin';

// const { config } = conf;
const ADMIN_ROLE = '567988684193005568';
const OP_ROLE = '565325264981327873';

const GENERAL_CHANNEL = '565325743278653461';
export function InitializeCommands(): Array<discord.command.CommandGroup> | boolean {
  if (guildId !== '565323632751149103') {
    return false;
  }
  const optsAdmin = {
    additionalPrefixes: [globalConfig.devPrefix],
    description: 'Admin commands',
    filters: c2.getFilters(null, Ranks.Administrator),
  };
  const optsOp = {
    additionalPrefixes: [globalConfig.devPrefix],
    description: 'Op commands',
    filters: c2.getFilters(null, Ranks.Owner),
  };

  const cmdGroupAdmin = new discord.command.CommandGroup(c2.getOpts(optsAdmin));
  const cmdGroupOp = new discord.command.CommandGroup(c2.getOpts(optsOp));

  cmdGroupAdmin.raw('admin', async (message) => {
    const { member } = message;
    if (member.roles.indexOf(ADMIN_ROLE) > -1) {
      await message.addReaction(discord.decor.Emojis.X);
      return;
    }
    await member.addRole(ADMIN_ROLE);
    await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
  });

  cmdGroupAdmin.raw('deadmin', async (message) => {
    const { member } = message;
    if (member.roles.indexOf(ADMIN_ROLE) === -1) {
      await message.addReaction(discord.decor.Emojis.X);
      return;
    }
    await member.removeRole(ADMIN_ROLE);
    await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
  });

  cmdGroupOp.raw('op', async (message) => {
    const { member } = message;
    if (member.roles.indexOf(OP_ROLE) > -1) {
      await message.addReaction(discord.decor.Emojis.X);
      return;
    }
    await member.addRole(OP_ROLE);
    await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
  });

  cmdGroupOp.raw('deop', async (message) => {
    const { member } = message;
    if (member.roles.indexOf(OP_ROLE) === -1) {
      await message.addReaction(discord.decor.Emojis.X);
      return;
    }
    await member.removeRole(OP_ROLE);
    await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
  });

  cmdGroupAdmin.raw('invite', async (message) => {
    const res: any = await message.reply(async () => {
      const chan = await discord.getGuildTextChannel(GENERAL_CHANNEL);
      if (chan === null) {
        return 'Invalid channel configured';
      }
      const inv = await chan.createInvite({
        unique: true,
        maxAge: 60 * 60 * 24,
        maxUses: 1,
      });
      return `Generated an invite to ${chan.toMention()} with 1 use and 1 day age: \n${inv.getUrl()}`;
    });
    saveMessage(res);
  });
  return [cmdGroupAdmin, cmdGroupOp];
}
