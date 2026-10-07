import { COMMON_NAMES } from "./data.js";

// Original concise summaries of the linked NOAA species accounts.
// No dive bounds, habitat assignments or conservation status are inferred here.
const FACTS = {
  "Phocoena phocoena": {
    "fact": "Its small triangular dorsal fin and blunt head help distinguish this porpoise from dolphins.",
    "source": "https://www.fisheries.noaa.gov/species/harbor-porpoise"
  },
  "Megaptera novaeangliae": {
    "fact": "Researchers recognise individual humpbacks by the patterns, shape and scars on their tail flukes.",
    "source": "https://www.fisheries.noaa.gov/species/humpback-whale"
  },
  "Orcinus orca": {
    "fact": "Killer whale groups learn distinctive calls that help keep members together.",
    "source": "https://www.fisheries.noaa.gov/species/killer-whale"
  },
  "Delphinus delphis": {
    "fact": "A yellowish panel and grey flank form the distinctive hourglass pattern on its sides.",
    "source": "https://www.fisheries.noaa.gov/species/short-beaked-common-dolphin"
  },
  "Tursiops truncatus": {
    "fact": "Bottlenose dolphins can cooperate to herd fish before taking turns feeding on the school.",
    "source": "https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin"
  },
  "Balaenoptera acutorostrata": {
    "fact": "Northern Hemisphere common minke whales have a conspicuous white band across each flipper.",
    "source": "https://www.fisheries.noaa.gov/species/minke-whale"
  },
  "Lagenorhynchus albirostris": {
    "fact": "White-beaked dolphins sometimes work together to catch schooling fish.",
    "source": "https://www.fisheries.noaa.gov/species/white-beaked-dolphin"
  },
  "Delphinapterus leucas": {
    "fact": "Belugas can turn and nod their heads because their neck vertebrae are not fused.",
    "source": "https://www.fisheries.noaa.gov/species/beluga-whale"
  },
  "Balaenoptera physalus": {
    "fact": "The lower jaw has contrasting colours, dark on the left and white on the right.",
    "source": "https://www.fisheries.noaa.gov/species/fin-whale"
  },
  "Physeter macrocephalus": {
    "fact": "A sperm whale’s single blowhole sits off centre on the left side of its head.",
    "source": "https://www.fisheries.noaa.gov/species/sperm-whale"
  },
  "Globicephala melas": {
    "fact": "Its common name refers to the long, curved flippers on either side of its body.",
    "source": "https://www.fisheries.noaa.gov/species/long-finned-pilot-whale"
  },
  "Grampus griseus": {
    "fact": "Risso’s dolphins often become paler with age and accumulate conspicuous scars.",
    "source": "https://www.fisheries.noaa.gov/species/rissos-dolphin"
  },
  "Balaena mysticetus": {
    "fact": "Bowheads have the longest baleen plates of any whale, used to filter small prey from seawater.",
    "source": "https://www.fisheries.noaa.gov/species/bowhead-whale"
  },
  "Balaenoptera musculus": {
    "fact": "Blue whales trap krill with baleen plates while pushing swallowed seawater out of their mouths.",
    "source": "https://www.fisheries.noaa.gov/species/blue-whale"
  },
  "Lagenorhynchus acutus": {
    "fact": "A white flank patch beneath a yellowish streak helps identify this dolphin.",
    "source": "https://www.fisheries.noaa.gov/species/atlantic-white-sided-dolphin"
  }
};

/** All authoritative app keys have names; verified profiles also have fact and source. */
export const WHALE_INFO = Object.freeze(Object.fromEntries(
  Object.entries(COMMON_NAMES).map(([name, names]) => [
    name, Object.freeze({ commonName: names.en, ...(FACTS[name] || {}) })
  ])
));

/** Return profile data, or null for an unknown scientific name. */
export function getWhaleInfo(name) {
  if (typeof name !== "string") return null;
  const scientificName = name.trim();
  return Object.hasOwn(WHALE_INFO, scientificName) ? WHALE_INFO[scientificName] : null;
}
