import * as cmd_general from './general';
import * as cmd_fun from './fun';
import * as cmd_dev from './dev';

export const commandsFiles = {
  general: cmd_general.InitializeCommands,
  fun: cmd_fun.InitializeCommands,
  dev: cmd_dev.InitializeCommands
};
