export let EventOverrides = <any>{};

EventOverrides['GUILD_ROLE_CREATE'] = function(
  roleUpdate: discord.Event.IGuildRoleCreate
) {
  return [roleUpdate.role];
};
/*EventOverrides['CHANNELS_PINS_UPDATE'] = function(
  ch: discord.Event.IChannelPinsUpdate
) {
  console.log(ch);
  return [ch];
};*/
EventOverrides['GUILD_ROLE_UPDATE'] = function(
  roleUpdate: discord.Event.IGuildRoleUpdate,
  oldRole: discord.Role
) {
  return [roleUpdate.role, oldRole];
};
EventOverrides['GUILD_ROLE_DELETE'] = function(
  roleUpdate: discord.Event.IGuildRoleDelete,
  oldRole: discord.Role
) {
  return [oldRole];
};
