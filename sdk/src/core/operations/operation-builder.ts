import { Transaction, SignPayloadsRequest } from '../../types/operations'
import { Identity, Credentials } from '../../types/auth'
import { IdentityPermissions } from '../../types/operations'

export class OperationBuilder {
  private accountId: string
  private nonce: number

  constructor(accountId: string, nonce: number) {
    this.accountId = accountId
    this.nonce = nonce
  }

  addIdentity(
    identity: Identity,
    permissions?: IdentityPermissions
  ): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: {
        AddIdentity: {
          identity,
          permissions: permissions || { enable_act_as: false },
        },
      },
    }
  }

  addIdentityWithAuth(
    identity: Identity,
    credentials: Credentials,
    permissions?: IdentityPermissions
  ): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: {
        AddIdentityWithAuth: {
          identity_with_permissions: {
            identity,
            permissions: permissions || { enable_act_as: false },
          },
          credentials,
        },
      },
    }
  }

  removeIdentity(identity: Identity): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: {
        RemoveIdentity: identity,
      },
    }
  }

  removeAccount(): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: 'RemoveAccount',
    }
  }

  signPayloads(payloads: SignPayloadsRequest): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: {
        Sign: payloads,
      },
    }
  }
}
