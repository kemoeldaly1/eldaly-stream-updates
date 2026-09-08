const path = require('path');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  try {
    const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
    const exePath = path.join(context.appOutDir, 'ELDALY STREAM.exe');
    console.log('[fuses-hook] flipping on ' + exePath);
    await flipFuses(exePath, {
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: true,
    });
    console.log('[fuses-hook] done');
  } catch (err) {
    console.log('[fuses-hook] skipped (@electron/fuses optional):', err.message);
  }
};
