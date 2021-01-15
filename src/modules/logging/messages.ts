export function getTimestamp(dt: Date) {
  return `\`[${(`0${dt.getHours()}`).substr(-2)}:${(
    `0${dt.getMinutes()}`
  ).substr(-2)}:${(`0${dt.getSeconds()}`).substr(-2)}]\``;
}
