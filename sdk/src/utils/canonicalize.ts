import canonicalize from 'canonicalize'

export const canonicalizeOrThrow = (data: unknown): string => {
  const ret = canonicalize(data)
  if (!ret) throw new Error('Failed to canonicalize')
  return ret
}
