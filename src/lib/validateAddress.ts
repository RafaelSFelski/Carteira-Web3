const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidAddress(address: string): boolean {
  return ADDRESS_REGEX.test(address.trim());
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

/** Compact display: 0x1234…abcd */
export function shortenAddress(address: string, chars = 4): string {
  const a = address.trim();
  if (a.length < chars * 2 + 2) return a;
  return `${a.slice(0, 2 + chars)}…${a.slice(-chars)}`;
}
