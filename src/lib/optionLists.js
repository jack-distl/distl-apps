// The WordPress build (distl-app-wp) lets Distl Admins edit some lists and
// wording in /settings. This app has no Settings, so every list is simply
// its shipped defaults. Kept as the same call so files shared with the
// WordPress build (lib/taskLibrary.js) copy across unchanged.

/** The list as shipped. */
export function resolveList(_id, defaults) {
  return defaults
}
