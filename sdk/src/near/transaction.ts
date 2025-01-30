import { Action, actionCreators } from '@near-js/transactions'
import { transactions, utils as nearUtils, Near, KeyPair } from 'near-api-js'
import { createHash } from 'crypto'

const keyPair = KeyPair.fromString(
  'ed25519:Hyoj2s6ZjHny5UBuJRmnoXN5jai1jtpxFDGCgwHBnVGm4HW8dYABxoVLVHs9kE72a7RtPYg4QDrmgCTKcK3Sdhk'
)

export const sendTransactionUntil = async (
  near: Near,
  accountId: string,
  receiverId: string,
  actions: Action[]
) => {
  const publicKey = keyPair.getPublicKey()

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
    [
      {
        ...actionCreators.functionCall('auth', {}, 300000000000000n, 10n),
      },
    ],
    recentBlockHash
  )

  const serializedTx = nearUtils.serialize.serialize(
    transactions.SCHEMA.Transaction,
    tx
  )

  const serializedTxHash = createHash('sha256').update(serializedTx).digest()

  const nearTransactionSignature = keyPair.sign(serializedTxHash)

  const signedTransaction = new transactions.SignedTransaction({
    transaction: tx,
    signature: new transactions.Signature({
      keyType: tx.publicKey.keyType,
      data: nearTransactionSignature.signature,
    }),
  })

  const result =
    await near.connection.provider.sendTransactionAsync(signedTransaction)

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
