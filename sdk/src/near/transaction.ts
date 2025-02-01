import { Action } from '@near-js/transactions'
import { transactions, utils as nearUtils, Near, connect } from 'near-api-js'

export const sendTransactionUntil = async (
  nearBase: Near,
  accountId: string,
  receiverId: string,
  actions: Action[]
) => {
  // TODO: this a dirty hack to avoid the (transaction instanceof SignedTransaction) check in the sendTransactionUntil function
  const near = await connect(nearBase.config)
  const signer = near.connection.signer
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

  console.log({ result })

  if (!result.transaction.hash) {
    throw new Error('No transaction hash found')
  }
  const nearTxHash = result.transaction.hash

  let attempts = 0
  let txOutcome
  while (attempts < 5) {
    try {
      txOutcome = await near.connection.provider.txStatus(
        nearTxHash,
        accountId,
        'EXECUTED_OPTIMISTIC'
      )
      break
    } catch (error) {
      attempts++
      if (attempts === 3) throw error
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
  if (!txOutcome) {
    throw new Error('No transaction outcome found')
  }

  return txOutcome
}
