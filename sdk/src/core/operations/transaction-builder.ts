import {
  Transaction,
  Action,
  AddIdentityWithAuth,
  IdentityWithPermissions,
  SignPayloadsRequest,
  IdentityPermissions,
} from '../../types/operations'
import { Identity, Credentials } from '../../types/auth'

export class TransactionBuilder {
  private readonly accountId: string
  private readonly nonce: number

  constructor(accountId: string, nonce: number) {
    this.accountId = accountId
    this.nonce = nonce
  }

  createAddIdentity(
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

  createAddIdentityWithAuth(
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

  createRemoveIdentity(identity: Identity): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: {
        RemoveIdentity: identity,
      },
    }
  }

  createRemoveAccount(): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: 'RemoveAccount',
    }
  }

  createSignOperation(payloads: SignPayloadsRequest): Transaction {
    return {
      account_id: this.accountId,
      nonce: this.nonce,
      action: {
        Sign: payloads,
      },
    }
  }
}
