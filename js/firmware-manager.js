/**
 * Firmware Manager: downloads and parses firmware ZIP packages.
 */

(function() {
  window.Whimbrel.fetchAndParseFirmwareZip = async function(zipUrl, arrayBufferCache = null) {
    let buffer = arrayBufferCache;
    if (!buffer) {
      const res = await fetch(zipUrl);
      if (!res.ok) throw new Error("Failed to download firmware zip");
      buffer = await res.arrayBuffer();
    }

    const zip = await window.JSZip.loadAsync(buffer);

    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) throw new Error("manifest.json not found in the zip");

    const manifestStr = await manifestFile.async("string");
    const manifest = JSON.parse(manifestStr);

    const appManifest = manifest.manifest.application;
    if (!appManifest) throw new Error("Application manifest not found");

    const datFile = zip.file(appManifest.dat_file);
    const binFile = zip.file(appManifest.bin_file);

    if (!datFile || !binFile)
      throw new Error("Missing .dat or .bin files specified in manifest");

    const datBytes = await datFile.async("uint8array");
    const binBytes = await binFile.async("uint8array");

    return { datBytes, binBytes, buffer };
  };
})();
