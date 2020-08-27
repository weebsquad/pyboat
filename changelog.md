# Changelog

## 2020-08-26 - The big update \(TM\)

* Fixed several small issues with logging
* Added cat command to utilities module
* Add help and docs commands to commands module
* Infractions module
* Fix consistency issue with role update logging messages for events
* Change antiping to use the new infractions system
* Softlock some log action types for the master guild
* Added softban emoji action to AntiPing
* Removed `antiPing.muteRole` \(now uses infractions' mute role\)
* Removed `utilities.persist.duration` \(now saves forever\)
* Changed `utilities.backup show` to show info on a specific user
* Added `utilities.backup delete`
* Added cron for translation auto-cleaning every 5 minutes
* Added user channel overwrite persist tracking & restoring to utilities.persist

## 2020-08-22

* Several docs changes
* Fix towards logging module not displaying cdn links in embeds properly
* Fix towards logging module's member\_joined displaying miliseconds since account creation \(lol\)
* Beautified CHANNEL\_UPDATE permsChanged log message
* Add forward compatibility in logging module for more user tags in the future
* Removed kv keys from counting's config

## 2020-08-21

* Added "disabled" field to global config
* Added version checking to core config loading
* Added update system to core config loading
* Added every logging scope to the modules page
* Added commands to both utilities and commands modules
* Changed up a lot of stuff on these docs



