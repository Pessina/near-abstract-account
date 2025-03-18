import type { OIDCIdentity, WalletIdentity, WebAuthnIdentity } from './auth'

export interface Account {
  identities: IdentityWithPermissions[]
  nonce: number // TODO: u128 on rust, check support on TS later
}
export interface IdentityWithPermissions {
  identity: Identity
  permissions: IdentityPermissions
}

export type IdentityPermissions = {
  enable_act_as: boolean
} | null

export type Identity =
  | WalletIdentity
  | WebAuthnIdentity
  | OIDCIdentity
  | { Account: string }
