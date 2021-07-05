/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />
/// <reference types="node" />
import './updates';
import './config';
import * as ev from './lib/eventHandler/handler';
import * as crons from './lib/crons';

ev.InitializeEvents();
crons.InitializeCrons();
