// Provenance records keep their original paths; resolve them after the source move.
export const recordedAssetUrl = name => new URL('../../'+name.replace(/^prototype\//,'game/'),import.meta.url);
