/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

// import * as c2 from './lib/commands2';
import * as ev from './lib/eventHandler/handler';
import * as crons from './lib/crons';
// import * as conf from './config';

// conf.InitializeConfig();

// c2.InitializeCommands2();
ev.InitializeEvents();
crons.InitializeCrons();
