import { sendTransactionUntil } from '../near/transaction'
import type { AbstractAccountContractType } from '../types/contract'
import { actionCreators } from '@near-js/transactions'
import { Contract, Near, Account as NearAccount } from 'near-api-js'

export class AbstractAccountContract {
  private contract: AbstractAccountContractType
  private near: Near
  private accountId: string
  private contractId: string

  constructor({
    near,
    contractId,
    accountId,
    nearAccount,
  }: {
    near: Near
    contractId: string
    accountId: string
    nearAccount: NearAccount
  }) {
    this.near = near
    this.accountId = accountId
    this.contractId = contractId

    this.contract = new Contract(nearAccount, contractId, {
      viewMethods: [
        'get_account_by_id',
        'list_account_ids',
        'list_identities',
        'get_account_by_identity',
        'get_all_contracts',
        'get_signer_account',
        'storage_balance_of',
      ],
      changeMethods: [
        'add_account',
        'auth',
        'storage_deposit',
        'storage_withdraw',
      ],
      useLocalViewExecution: false,
    }) as unknown as AbstractAccountContractType
  }

  async getAccountById(
    obj: Parameters<AbstractAccountContractType['get_account_by_id']>[0]
  ) {
    return this.contract.get_account_by_id(obj)
  }

  async listAccountIds() {
    return this.contract.list_account_ids()
  }

  async listAuthIdentities(
    obj: Parameters<AbstractAccountContractType['list_identities']>[0]
  ) {
    return this.contract.list_identities(obj)
  }

  async getAccountByIdentity(
    obj: Parameters<AbstractAccountContractType['get_account_by_identity']>[0]
  ) {
    return this.contract.get_account_by_identity(obj)
  }

  async getAllContracts() {
    return this.contract.get_all_contracts()
  }

  async getSignerAccount() {
    return this.contract.get_signer_account()
  }

  async addAccount(
    obj: Parameters<AbstractAccountContractType['add_account']>[0]
  ) {
    return this.contract.add_account(obj)
  }

  async auth(obj: Parameters<AbstractAccountContractType['auth']>[0]) {
    const { retryCount, waitUntil, ...rest } = obj

    if (waitUntil) {
      return sendTransactionUntil(this.near, this.accountId, this.contractId, [
        actionCreators.functionCall(
          'auth',
          { user_op: 'sdfsd' },
          300000000000000n, // Near max gas
          10n // Deposit to handle network congestion
        ),
      ])
    }

    // if (retryCount) {
    //   return this.customNearAccount.sendTransactionWithRetry(
    //     this.contractId,
    //     [action],
    //     retryCount
    //   )
    // }

    const account = await this.near.account(this.accountId)

    return this.contract.auth({ signerAccount: account, ...rest })
  }

  async storageBalanceOf(
    obj: Parameters<AbstractAccountContractType['storage_balance_of']>[0]
  ) {
    return this.contract.storage_balance_of(obj)
  }

  async storageDeposit(
    obj: Parameters<AbstractAccountContractType['storage_deposit']>[0]
  ) {
    return this.contract.storage_deposit(obj)
  }

  async storageWithdraw(
    obj: Parameters<AbstractAccountContractType['storage_withdraw']>[0]
  ) {
    return this.contract.storage_withdraw(obj)
  }
}
