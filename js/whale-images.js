import { COMMON_NAMES } from "./data.js";

const IMAGE_BASE_URL = new URL("../assets/whales/", import.meta.url);
const PLACEHOLDER_URL = new URL("illustration-placeholder.svg", IMAGE_BASE_URL).href;
const initializedRoots = new WeakSet();

const WHALE_PHOTOS = new Map([
  [
    "Phocoena phocoena",
    {
      "file": "phocoena-phocoena.jpg",
      "author": "Erik Christensen",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Phocoena_phocoena.2.jpg"
    }
  ],
  [
    "Megaptera novaeangliae",
    {
      "file": "megaptera-novaeangliae.jpg",
      "author": "Jérémie Silvestro",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Baleine_%C3%A0_bosse_et_son_baleineau_2.jpg"
    }
  ],
  [
    "Orcinus orca",
    {
      "file": "orcinus-orca.jpg",
      "author": "Allen Shimada, NOAA/NMFS/OST/AMD",
      "license": "Public domain (US government work)",
      "licenseUrl": "https://www.fisheries.noaa.gov/website-policies-and-disclaimers#copyright-policy",
      "source": "https://commons.wikimedia.org/wiki/File:Anim1133_-_Flickr_-_NOAA_Photo_Library.jpg"
    }
  ],
  [
    "Delphinus delphis",
    {
      "file": "delphinus-delphis.jpg",
      "author": "Netspy (photograph), Medium69 (source crop)",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Delphinus_delphis_03-cropped.jpg"
    }
  ],
  [
    "Tursiops truncatus",
    {
      "file": "tursiops-truncatus.jpg",
      "author": "Giles Laurent",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "source": "https://commons.wikimedia.org/wiki/File:010_Atlantic_bottlenose_dolphin_jumping_at_Pelican_point_Photo_by_Giles_Laurent.jpg"
    }
  ],
  [
    "Balaenoptera acutorostrata",
    {
      "file": "balaenoptera-acutorostrata.jpg",
      "author": "NOAA",
      "license": "Public domain (US government work)",
      "licenseUrl": "https://www.fisheries.noaa.gov/website-policies-and-disclaimers#copyright-policy",
      "source": "https://commons.wikimedia.org/wiki/File:Minke_Whale_(NOAA).jpg"
    }
  ],
  [
    "Lagenorhynchus albirostris",
    {
      "file": "lagenorhynchus-albirostris.jpg",
      "author": "Hannah Beker",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
      "source": "https://commons.wikimedia.org/wiki/File:White_beaked_dolphin.jpg"
    }
  ],
  [
    "Delphinapterus leucas",
    {
      "file": "delphinapterus-leucas.jpg",
      "author": "Carquinyol",
      "license": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Beluga_oceanografic.jpg"
    }
  ],
  [
    "Balaenoptera physalus",
    {
      "file": "balaenoptera-physalus.jpg",
      "author": "Aqqa Rosing-Asvid / Visit Greenland",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Finhval.jpg"
    }
  ],
  [
    "Physeter macrocephalus",
    {
      "file": "physeter-macrocephalus.jpg",
      "author": "NOAA Northeast Fisheries Science Center",
      "license": "Public domain (US government work)",
      "licenseUrl": "https://www.fisheries.noaa.gov/website-policies-and-disclaimers#copyright-policy",
      "source": "https://www.fisheries.noaa.gov/species/sperm-whale"
    }
  ],
  [
    "Globicephala melas",
    {
      "file": "globicephala-melas.jpg",
      "author": "Aleuze",
      "license": "Public domain (released by copyright holder)",
      "licenseUrl": "https://commons.wikimedia.org/wiki/File:Globicephala_melas.jpg#Licensing",
      "source": "https://commons.wikimedia.org/wiki/File:Globicephala_melas.jpg"
    }
  ],
  [
    "Grampus griseus",
    {
      "file": "grampus-griseus.jpg",
      "author": "NOAA Fisheries/J. Cotton",
      "license": "Public domain (US government work)",
      "licenseUrl": "https://www.fisheries.noaa.gov/website-policies-and-disclaimers#copyright-policy",
      "source": "https://www.fisheries.noaa.gov/species/rissos-dolphin"
    }
  ],
  [
    "Balaena mysticetus",
    {
      "file": "balaena-mysticetus.jpg",
      "author": "NOAA Fisheries/Amelia Brower",
      "license": "Public domain (US government work)",
      "licenseUrl": "https://www.fisheries.noaa.gov/website-policies-and-disclaimers#copyright-policy",
      "source": "https://www.fisheries.noaa.gov/species/bowhead-whale"
    }
  ],
  [
    "Balaenoptera musculus",
    {
      "file": "balaenoptera-musculus.jpg",
      "author": "NOAA Fisheries",
      "license": "Public domain (US government work)",
      "licenseUrl": "https://www.fisheries.noaa.gov/website-policies-and-disclaimers#copyright-policy",
      "source": "https://www.fisheries.noaa.gov/species/blue-whale"
    }
  ],
  [
    "Lagenorhynchus acutus",
    {
      "file": "lagenorhynchus-acutus.jpg",
      "author": "NOAA Fisheries",
      "license": "Public domain (US government work)",
      "licenseUrl": "https://www.fisheries.noaa.gov/website-policies-and-disclaimers#copyright-policy",
      "source": "https://www.fisheries.noaa.gov/species/atlantic-white-sided-dolphin"
    }
  ]
]);

// ASVS 1.2.1: encode text and attribute values at the HTML output boundary.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function imageMarkup({ src, alt, title, className, imageType, species, commonName }) {
  return (
    '<img class="' +
    className +
    '" src="' +
    escapeHtml(src) +
    '" width="44" height="44" loading="lazy" decoding="async" ' +
    'style="width:44px;height:44px;object-fit:cover;display:block;flex:0 0 44px" ' +
    'alt="' +
    escapeHtml(alt) +
    '" title="' +
    escapeHtml(title) +
    '" data-whale-image="' +
    imageType +
    '" data-whale-species="' +
    escapeHtml(species) +
    '" data-whale-common="' +
    escapeHtml(commonName) +
    '">'
  );
}

function illustrationMarkup(species) {
  const label = species || "unknown species";
  return imageMarkup({
    src: PLACEHOLDER_URL,
    alt: "Illustration placeholder for " + label + "; generic illustration, not a species photo.",
    title: "Illustration placeholder. This is not a species photograph.",
    className: "whale-thumbnail whale-thumbnail--illustration",
    imageType: "illustration",
    species: label,
    commonName: "",
  });
}

/**
 * Return a local 44px photo thumbnail for a supported scientific name.
 * Unsupported names receive a clearly labelled generic illustration.
 */
export function whaleThumbnail(species) {
  const scientificName = typeof species === "string" ? species.trim() : "";
  const photo = WHALE_PHOTOS.get(scientificName);

  if (!photo) {
    return illustrationMarkup(scientificName);
  }

  const commonName = COMMON_NAMES[scientificName]?.en || scientificName;
  return imageMarkup({
    src: new URL(photo.file, IMAGE_BASE_URL).href,
    alt: "Photo of " + commonName + " (" + scientificName + ").",
    title:
      "Photo of " +
      commonName +
      " (" +
      scientificName +
      ") by " +
      photo.author +
      ", licensed " +
      photo.license +
      " (" + photo.licenseUrl + "). Source: " +
      photo.source,
    className: "whale-thumbnail",
    imageType: "photo",
    species: scientificName,
    commonName: commonName,
  });
}

function handleWhaleImageError(event) {
  const image = event.target;

  if (!image || image.tagName !== "IMG" || image.dataset.whaleImage !== "photo") {
    return;
  }

  const species = image.dataset.whaleSpecies || "unknown species";
  image.dataset.whaleImage = "illustration";
  image.classList.add("whale-thumbnail--illustration");
  image.src = PLACEHOLDER_URL;
  image.alt =
    "Illustration placeholder for " +
    species +
    "; generic illustration, not a species photo. The local photo could not be loaded.";
  image.title = "Illustration placeholder. This is not a species photograph.";
}

/**
 * Install one delegated local-image fallback handler on a document or element.
 * Call once after importing this module. Repeated calls for the same root are safe.
 */
export function initWhaleImages(root = globalThis.document) {
  if (!root || typeof root.addEventListener !== "function" || initializedRoots.has(root)) {
    return false;
  }

  initializedRoots.add(root);
  root.addEventListener("error", handleWhaleImageError, true);
  return true;
}
