import { CustomNearAccount } from '@/near/CustomNearAccount'
import { AbstractAccountContractType } from '@/types/contract'
import { Action, actionCreators } from '@near-js/transactions'
import { Contract, Account as NearAccount } from 'near-api-js'

export class AbstractAccountContract {
  private contract: AbstractAccountContractType
  private account: CustomNearAccount
  private contractId: string

  constructor({
    account,
    contractId,
  }: {
    account: NearAccount
    contractId: string
  }) {
    this.contract = new Contract(account, contractId, {
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

    this.account = new CustomNearAccount(account.connection, account.accountId)
    this.contractId = contractId
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

    const action: Action = actionCreators.functionCall(
      'auth',
      obj.args,
      obj.gas ? BigInt(obj.gas) : undefined,
      obj.amount ? BigInt(obj.amount) : undefined
    )

    if (waitUntil) {
      return this.account.sendTransactionUntil(
        this.contractId,
        [action],
        waitUntil
      )
    }
    if (retryCount) {
      return this.account.sendTransactionWithRetry(
        this.contractId,
        [action],
        retryCount
      )
    }
    return this.contract.auth(rest)
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
