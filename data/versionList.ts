/** Partial port of version list stuff from Emacs */

import type { VersionList } from "./schema.ts";

/**
 * Return the first non-zero element of `lst`.
 * If all `lst` elements are zeros or `lst` is empty, return zero.
 */
function versionListNotZero(lst: VersionList) {
  // While I say I'm using the same logic below, this is clearly a better
  // implementation.
  return lst.find((elem) => elem !== 0) ?? 0;
}

/**
 * Return true if `l1` is lower than `l2`.
 *
 * > Note that a version specified by the list (1) is equal to (1 0), (1 0 0),
 * > (1 0 0 0), etc. That is, the trailing zeros are insignificant. Also, a
 * > version given by the list (1) is higher than (1 -1), which in turn is
 * > higher than (1 -2), which is higher than (1 -3).
 */
export function versionListLessThan(l1: VersionList, l2: VersionList) {
  // To do a direct port I'm using the same logic, and the original logic
  // mutates the references directly. JS doesn't allow mutating input arguments
  // so this is necessary.
  let l1ref = l1;
  let l2ref = l2;
  while (l1ref.length > 0 && l2ref.length > 0 && l1ref[0] === l2ref[0]) {
    l1ref = l1ref.slice(1);
    l2ref = l2ref.slice(1);
  }
  // both not empty
  if (l1ref.length > 0 && l2ref.length > 0) {
    return l1ref[0] < l2ref[0];
  }
  // both empty, ie. original length is the same
  if (l1ref.length === 0 && l2ref.length === 0) {
    // they are equal, which means not less than
    return false;
  }
  // l1 not empty but l2 is empty => l1 longer than l2
  if (l1ref.length > 0) {
    return versionListNotZero(l1ref) < 0;
  }
  // l1 is empty but l2 not empty => l2 longer than l1
  return 0 < versionListNotZero(l2ref);
}

export function versionListEqual(l1: VersionList, l2: VersionList) {
  // To do a direct port I'm using the same logic, and the original logic
  // mutates the references directly. JS doesn't allow mutating input arguments
  // so this is necessary.
  let l1ref = l1;
  let l2ref = l2;
  while (l1ref.length > 0 && l2ref.length > 0 && l1ref[0] === l2ref[0]) {
    l1ref = l1ref.slice(1);
    l2ref = l2ref.slice(1);
  }
  // both not empty
  if (l1ref.length > 0 && l2ref.length > 0) {
    return false;
  }
  // both empty, ie. original length is the same
  if (l1ref.length === 0 && l2ref.length === 0) {
    // they are equal, which means not less than
    return true;
  }
  // l1 not empty but l2 is empty => l1 longer than l2
  if (l1ref.length > 0) {
    return versionListNotZero(l1ref) === 0;
  }
  // l1 is empty but l2 not empty => l2 longer than l1
  return versionListNotZero(l2ref) === 0;
}
