import { OnEvent, EventHasExecution } from './routing';
import { discordEventsMap, eventFunctions } from '../../constants/constants';
import * as utils from '../utils';

function registerHandler(name: string) {
  if (!EventHasExecution(name)) {
    return;
  }
  discord.on(discordEventsMap[name], async (...args) => {
    const ts = utils.composeSnowflake();
    await OnEvent(name, ts, ...args);
  });
}
export function InitializeEvents() {
  const names = Object.keys(eventFunctions);
  names.forEach(registerHandler);
}
