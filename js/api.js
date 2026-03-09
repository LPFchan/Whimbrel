/**
 * API Service for interacting with GitHub releases.
 */

(function() {
  const { CONFIG } = window.Whimbrel;

  window.Whimbrel.fetchDeviceReleases = async function(repoName) {
    if (window.Whimbrel.DEMO_MODE) {
      return [{ tag_name: "v0.1.0", html_url: "#", assets: [
        { name: "guillemot-v0.1.0.zip", browser_download_url: "#" },
        { name: "uguisu-v0.1.0.zip", browser_download_url: "#" }
      ]}];
    }
    const fullRepo = repoName.includes('/') ? repoName : `${CONFIG.GITHUB_OWNER}/${repoName}`;
    const res = await fetch(`https://api.github.com/repos/${fullRepo}/releases`);
    if (!res.ok) throw new Error("Failed to fetch releases");

    const data = await res.json();
    const validReleases = data.filter((r) => r.assets && r.assets.some((a) => a.name.endsWith(".zip")));

    if (validReleases.length === 0) throw new Error("No .zip firmware package found in releases");
    
    return validReleases;
  };
})();
