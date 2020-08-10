/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

import * as c2 from './lib/commands2';
import * as ev from './lib/eventHandler/handler';
import * as crons from './lib/crons';

c2.InitializeCommands2();
ev.InitializeEvents();
crons.InitializeCrons();

discord.on(discord.Event.GUILD_MEMBER_UPDATE, async (mem, oldMem) => {
  console.log('onMemUpdateRaw', mem, oldMem);
});
