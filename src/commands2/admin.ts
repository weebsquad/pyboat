import { globalConfig, Ranks } from '../config';
import * as c2 from '../lib/commands2';

// const { config } = conf;
const ADMIN_ROLE = '567988684193005568';
const OP_ROLE = '565325264981327873';

const GENERAL_CHANNEL = '565325743278653461';

const optsAdmin = {
  additionalPrefixes: [globalConfig.devPrefix],
  description: 'Admin commands',
  filters: c2.getFilters(Ranks.Administrator),
};
const optsOp = {
  additionalPrefixes: [globalConfig.devPrefix],
  description: 'Op commands',
  filters: c2.getFilters(Ranks.Owner),
};

export const cmdGroupAdmin = new discord.command.CommandGroup(c2.getOpts(optsAdmin));
export const cmdGroupOp = new discord.command.CommandGroup(c2.getOpts(optsOp));
