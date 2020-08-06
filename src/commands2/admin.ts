import * as conf from '../config';
import * as utils from '../lib/utils';
import * as commands2 from '../lib/commands2';
const config = conf.config;
const ADMIN_ROLE = '567988684193005568';
const OP_ROLE = '565325264981327873';

const GENERAL_CHANNEL = '565325743278653461';

const F = discord.command.filters;
const kv = new pylon.KVNamespace('commands_admin');

let optsAdmin = {
  additionalPrefixes: ['p/'],
  description: 'Admin commands',
  filters: F.or(
    F.isOwner(),
    F.custom(
      (message) => utils.canMemberRun(conf.Ranks.Administrator, message.member),
      'Must be server admin'
    )
  )
};
let optsOp = {
  additionalPrefixes: ['p/'],
  description: 'Op commands',
  filters: F.or(
    F.isOwner(),
    F.custom(
      (message) => utils.canMemberRun(conf.Ranks.Owner, message.member),
      'Must be server op'
    )
  )
};

export const cmdGroupAdmin = new discord.command.CommandGroup(
  commands2.getOpts(optsAdmin) as discord.command.ICommandGroupOptions
);
export const cmdGroupOp = new discord.command.CommandGroup(
  commands2.getOpts(optsOp) as discord.command.ICommandGroupOptions
);

const admin = cmdGroupAdmin.raw('admin', async (message) => {
  let member = message.member;
  if (member.roles.indexOf(ADMIN_ROLE) > -1)
    return await message.addReaction(discord.decor.Emojis.X);
  await member.addRole(ADMIN_ROLE);
  await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
});

const deadmin = cmdGroupAdmin.raw('deadmin', async (message) => {
  let member = message.member;
  if (member.roles.indexOf(ADMIN_ROLE) === -1)
    return await message.addReaction(discord.decor.Emojis.X);
  await member.removeRole(ADMIN_ROLE);
  await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
});

const op = cmdGroupOp.raw('op', async (message) => {
  let member = message.member;
  if (member.roles.indexOf(OP_ROLE) > -1)
    return await message.addReaction(discord.decor.Emojis.X);
  await member.addRole(OP_ROLE);
  await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
});

const deop = cmdGroupOp.raw('deop', async (message) => {
  let member = message.member;
  if (member.roles.indexOf(OP_ROLE) === -1)
    return await message.addReaction(discord.decor.Emojis.X);
  await member.removeRole(OP_ROLE);
  await message.addReaction(discord.decor.Emojis.WHITE_CHECK_MARK);
});

const invite = cmdGroupAdmin.raw('invite', async (message) => {
  await message.reply(async function() {
    let chan = await discord.getGuildTextChannel(GENERAL_CHANNEL);
    if (chan === null) {
      return 'Invalid channel configured';
    }
    let inv = await chan.createInvite({
      unique: true,
      maxAge: 60 * 60 * 24,
      maxUses: 1
    });
    return `Generated an invite to ${chan.toMention()} with 1 use and 1 day age: \n${inv.getUrl()}`;
  });
});
