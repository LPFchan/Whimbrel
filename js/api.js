/**
 * API Service for interacting with GitHub releases.
 */

(function() {
  const { CONFIG } = window.Whimbrel;

  window.Whimbrel.fetchDeviceReleases = async function(repoName) {
    const res = await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${repoName}/releases`);
    if (!res.ok) throw new Error("Failed to fetch releases");

    const data = await res.json();
    const validReleases = data.filter((r) => r.assets && r.assets.some((a) => a.name.endsWith(".zip")));

    if (validReleases.length === 0) throw new Error("No .zip firmware package found in releases");
    
    return validReleases;
  };
})();
