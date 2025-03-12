import type {
  Identity,
  IdentityWithPermissions,
  IdentityPermissions,
} from './account'
import type {
  WebAuthnCredentials,
  WalletCredentials,
  OIDCCredentials,
} from './auth'

export interface UserOperation {
  auth: Auth
  act_as?: Identity
  transaction: Transaction
}

export interface Transaction {
  account_id: string
  nonce: number
  action: Action
}

export type Action =
  | 'RemoveAccount'
  | { AddIdentityWithAuth: AddIdentityWithAuth }
  | { AddIdentity: IdentityWithPermissions }
  | { RemoveIdentity: Identity }
  | { Sign: SignPayloadsRequest }

export interface AddIdentityWithAuth {
  identity_with_permissions: IdentityWithPermissions
  credentials: Credentials
}

export interface Auth {
  identity: Identity
  credentials: Credentials
}

export type Credentials =
  | WebAuthnCredentials
  | WalletCredentials
  | OIDCCredentials

export interface SignPayloadsRequest {
  contract_id: string
  payloads: SignRequest[]
}

export interface SignRequest {
  payload: number[]
  path: string
  key_version: number
}

// TODO: Check where to place this
export interface ActionSignableMessage {
  account_id: string
  nonce: string
  action: string
  permissions?: IdentityPermissions
}

export interface MPCSignature {
  big_r: {
    affine_point: string
  }
  s: {
    scalar: string
  }
  recovery_id: number
}
