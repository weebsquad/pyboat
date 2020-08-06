
/// <reference path="../typings/index.d.ts" />

import {InitializeEvents} from './lib/eventHandler/handler';
//import { InitializeCommands } from './lib/commands';
import { InitializeCommands2 } from './lib/commands2';
import { InitializeCrons } from './lib/crons';


InitializeEvents();
InitializeCrons();
InitializeCommands2();