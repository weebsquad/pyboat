import * as utils from '../../lib/utils' ;

export function getTimestamp(dt: Date) {
  return `\`[\`${utils.getDiscordTimestamp(dt, 'T')}\`]\``;
  /*return `\`[${(`0${dt.getHours()}`).substr(-2)}:${(
    `0${dt.getMinutes()}`
  ).substr(-2)}:${(`0${dt.getSeconds()}`).substr(-2)}]\``;*/
}
