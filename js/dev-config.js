/* ---- dev-config.js ---- */
/* Developer build only: tools/build-release.sh deletes this file from the release.
   Loaded before sim.js so that game.js saves under its own key and never touches a player's real save. */
window.SHKR_DEV = { saveKey: "shadowskirr.dev.v1" };
