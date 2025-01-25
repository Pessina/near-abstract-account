import { Identity, Credentials, Auth, WalletType } from './auth'

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

export interface IdentityWithPermissions {
  identity: Identity
  permissions: IdentityPermissions
}

export interface IdentityPermissions {
  enable_act_as: boolean
}

export interface SignRequest {
  payload: number[]
  path: string
  key_version: number
}

export interface SignPayloadsRequest {
  contract_id: string
  payloads: SignRequest[]
}

export interface ActionSignableMessage {
  account_id: string
  nonce: string
  action: string
  permissions?: IdentityPermissions
}

export interface Signature {
  big_r: {
    affine_point: string
  }
  s: {
    scalar: string
  }
  recovery_id: number
}

export interface Account {
  identities: IdentityWithPermissions[]
  nonce: number
}

export interface StorageBalance {
  total: string
  available: string
}
