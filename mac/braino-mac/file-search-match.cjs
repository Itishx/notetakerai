"use strict";

function normalizeSearchToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistanceWithin(a, b, maxDistance) {
  const left = String(a || "");
  const right = String(b || "");
  if (Math.abs(left.length - right.length) > maxDistance) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > maxDistance) return false;
    previous = current;
  }
  return previous[right.length] <= maxDistance;
}

function fuzzyWordIncluded(candidateWords, queryWord) {
  if (!queryWord) return true;
  if (candidateWords.includes(queryWord)) return true;
  if (queryWord.length <= 2) return false;
  return candidateWords.some((candidateWord) => {
    if (candidateWord.length <= 2) return false;
    if (candidateWord.includes(queryWord)) return true;
    const maxDistance = queryWord.length >= 7 ? 2 : 1;
    return editDistanceWithin(candidateWord, queryWord, maxDistance);
  });
}

function candidateMatchesQuery(candidateText, queryText) {
  const candidate = normalizeSearchToken(candidateText);
  const query = normalizeSearchToken(queryText);
  if (!candidate || !query) return false;
  if (candidate.includes(query)) return true;
  const candidateWords = candidate.split(" ").filter(Boolean);
  const queryWords = query.split(" ").filter(Boolean);
  if (!queryWords.length) return false;
  return queryWords.every((word) => fuzzyWordIncluded(candidateWords, word));
}

module.exports = {
  candidateMatchesQuery,
  editDistanceWithin,
  fuzzyWordIncluded,
  normalizeSearchToken,
};
