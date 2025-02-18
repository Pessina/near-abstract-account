import { NEAR_MAX_GAS } from '../near'
import { sendTransactionUntil } from '../near/transaction'
import type {
  AbstractAccountContractType,
  ExtendedContractChangeArgs,
} from '../types/contract'
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

  private async withSignerAccount<T, R>(
    method: (params: ExtendedContractChangeArgs<T>) => Promise<R>,
    params: ExtendedContractChangeArgs<T>
  ): Promise<R> {
    return method({
      ...params,
      signerAccount: await this.near.account(this.accountId),
    })
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
    return this.withSignerAccount(
      this.contract.add_account.bind(this.contract),
      obj
    )
  }

  async auth(obj: Parameters<AbstractAccountContractType['auth']>[0]) {
    const { waitUntil, args, gas = NEAR_MAX_GAS, amount = 0 } = obj

    if (waitUntil) {
      return sendTransactionUntil(this.near, this.accountId, this.contractId, [
        actionCreators.functionCall('auth', args, BigInt(gas), BigInt(amount)),
      ])
    }

    return this.withSignerAccount(this.contract.auth.bind(this.contract), obj)
  }

  async storageBalanceOf(
    obj: Parameters<AbstractAccountContractType['storage_balance_of']>[0]
  ) {
    return this.contract.storage_balance_of(obj)
  }

  async storageDeposit(
    obj: Parameters<AbstractAccountContractType['storage_deposit']>[0]
  ) {
    return this.withSignerAccount(
      this.contract.storage_deposit.bind(this.contract),
      obj
    )
  }

  async storageWithdraw(
    obj: Parameters<AbstractAccountContractType['storage_withdraw']>[0]
  ) {
    return this.withSignerAccount(
      this.contract.storage_withdraw.bind(this.contract),
      obj
    )
  }
}
