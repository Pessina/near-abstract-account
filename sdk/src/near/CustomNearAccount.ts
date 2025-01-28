import { Account, Connection } from '@near-js/accounts'
import { Action } from '@near-js/transactions'
import { FinalExecutionOutcome, TxExecutionStatus } from '@near-js/types'
import { getTransactionLastResult } from 'near-api-js/lib/providers'

export class CustomNearAccount extends Account {
    constructor(connection: Connection, accountId: string) {
        super(connection, accountId)
    }

    async sendTransactionUntil(
        receiverId: string,
        actions: Action[],
        waitUntil: TxExecutionStatus
    ): Promise<FinalExecutionOutcome> {
        const [_, signedTransaction] = await this.signTransaction(
            receiverId,
            actions
        )

        const outcome = await this.connection.provider.sendTransactionUntil(
            signedTransaction,
            waitUntil
        )

        return outcome
    }

    async sendTransactionWithRetry(
        receiverId: string,
        actions: Action[],
        retryCount: number = 3
    ) {
        const result = await this.sendTransactionUntil(
            receiverId,
            actions,
            "NONE"
        )

        if (!result.transaction.hash) {
            throw new Error("No transaction hash found");
        }

        const txOutcome = await new Promise<any>((resolve, reject) => {
            let attempts = 0;
            const tryGetStatus = async () => {
                try {
                    const outcome = await this.connection.provider.txStatus(
                        result.transaction.hash,
                        this.accountId,
                        "EXECUTED_OPTIMISTIC"
                    );
                    resolve(outcome);
                } catch (error) {
                    attempts++;
                    if (attempts === retryCount) {
                        reject(error);
                        return;
                    }
                    setTimeout(tryGetStatus, 5000); // 5s is Near RPC timeout
                }
            };
            tryGetStatus();
        });

        if (!txOutcome) {
            throw new Error("No transaction outcome found");
        }

        return getTransactionLastResult(txOutcome);
    }
}
