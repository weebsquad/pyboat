namespace Crowdin {
    interface Manifest {
        
    }
}

const DISTRIBUTION_HASH = "bdd7c12b3b92f93b8a7d438aiuz";
const API_URL = "https://distributions.crowdin.net/";

export async function getManifest() {
    const url = `${API_URL}${DISTRIBUTION_HASH}/manifest.json`;
    const res = await fetch(url);
    const json = await res.json();

}