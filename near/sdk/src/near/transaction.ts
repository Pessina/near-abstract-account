import { Action } from '@near-js/transactions'
import { transactions, utils as nearUtils, Near, connect } from 'near-api-js'
import type { TxExecutionStatus } from '@near-js/types'
import { getTransactionLastResult } from '@near-js/utils'

export const sendTransactionUntil = async (
  nearBase: Near,
  accountId: string,
  receiverId: string,
  actions: Action[],
  until: TxExecutionStatus = 'EXECUTED_OPTIMISTIC',
  retryCount = 3
) => {
  // TODO: this a dirty hack to avoid the (transaction instanceof SignedTransaction) check in the sendTransactionUntil function
  const near = await connect(nearBase.config)
  const { signer } = near.connection
  const publicKey = await signer.getPublicKey(
    accountId,
    near.connection.networkId
  )

  const accessKey = (await near.connection.provider.query(
    `access_key/${accountId}/${publicKey.toString()}`,
    ''
  )) as {
    block_hash: string
    block_height: number
    nonce: number
    permission: string
  }

  const recentBlockHash = nearUtils.serialize.base_decode(accessKey.block_hash)

  const tx = transactions.createTransaction(
    accountId,
    publicKey,
    receiverId,
    ++accessKey.nonce,
    actions,
    recentBlockHash
  )

  const serializedTx = nearUtils.serialize.serialize(
    transactions.SCHEMA.Transaction,
    tx
  )

  const nearTransactionSignature = await signer.signMessage(
    serializedTx,
    accountId,
    near.connection.networkId
  )

  const signedTransaction = new transactions.SignedTransaction({
    transaction: tx,
    signature: new transactions.Signature({
      keyType: tx.publicKey.keyType,
      data: nearTransactionSignature.signature,
    }),
  })

  const result = await near.connection.provider.sendTransactionUntil(
    signedTransaction,
    'INCLUDED_FINAL'
  )

  if (!result.transaction.hash) {
    throw new Error('No transaction hash found')
  }

  let i = 0
  do {
    try {
      const txOutcome = await near.connection.provider.txStatus(
        result.transaction.hash,
        accountId,
        until
      )

      if (txOutcome) {
        return getTransactionLastResult(txOutcome)
      }

      throw new Error('Transaction not found')
    } catch (error) {
      if (i === retryCount - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Near RPC timeout
    }
    i++
  } while (i < retryCount)

  throw new Error('Failed to get transaction status')
}
