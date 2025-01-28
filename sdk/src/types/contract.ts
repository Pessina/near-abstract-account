import { Contract } from 'near-api-js'
import { IdentityWithPermissions, Identity, Account } from './account'
import { UserOperation } from './user-operation'
import { TxExecutionStatus } from '@near-js/types'

export type ContractChangeMethodArgs<T = void> = {
  args: T
  gas?: string
  amount?: string
}

export type ExtendedContractChangeArgs<T = void> =
  ContractChangeMethodArgs<T> & {
    retryCount?: number
    waitUntil?: TxExecutionStatus
  }

export interface StorageBalance {
  total: string
  available: string
}

export type AbstractAccountContractType = Contract & {
  get_account_by_id: (args: { account_id: string }) => Promise<Account | null>
  list_account_ids: () => Promise<string[]>
  list_identities: (args: {
    account_id: string
  }) => Promise<IdentityWithPermissions[] | null>
  get_account_by_identity: (args: { identity: Identity }) => Promise<string[]>
  get_all_contracts: () => Promise<string[]>
  get_signer_account: () => Promise<string>
  add_account: (
    args: ExtendedContractChangeArgs<{
      account_id: string
      identity_with_permissions: IdentityWithPermissions
    }>
  ) => Promise<void>
  auth: <T>(
    args: ExtendedContractChangeArgs<{
      user_op: UserOperation
    }>
  ) => Promise<T>
  storage_balance_of: (args: {
    account_id: string
  }) => Promise<StorageBalance | null>
  storage_deposit: (
    args: ExtendedContractChangeArgs<{
      account_id?: string
      registration_only?: boolean
    }>
  ) => Promise<StorageBalance>
  storage_withdraw: (
    args: ExtendedContractChangeArgs<{
      amount?: string
    }>
  ) => Promise<StorageBalance>
}
