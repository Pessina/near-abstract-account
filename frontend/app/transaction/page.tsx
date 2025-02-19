"use client"

import { Action, Identity, UserOperation, AbstractAccountContractBuilder } from "chainsig-aa.js"
import React, { useEffect, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import {
    utils,
    EVM,
    Bitcoin,
    Cosmos,
    BTCRpcAdapters,
    MPCSignature,
    EVMUnsignedTransaction,
    BTCUnsignedTransaction,
    CosmosUnsignedTransaction
} from 'signet.js'

import AuthModal from "@/components/AuthModal"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAbstractAccountContract } from "@/contracts/useAbstractAccountContract"
import { useToast } from "@/hooks/use-toast"
import { useEnv } from "@/hooks/useEnv"

type FormValues = {
    accountId: string;
    contractId: string;
    to: string;
    value: string;
    actAs: boolean;
    actAsIdentity?: string;
    selectedIdentity?: string;
    chain: "evm" | "btc" | "osmo";
}

type AuthProps = {
    accountId: string;
    transaction: {
        account_id: string;
        nonce: number;
        action: Action;
    };
    userOp: UserOperation;
}

export default function TransactionForm() {
    const [authProps, setAuthProps] = useState<AuthProps | null>(null)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [availableIdentities, setAvailableIdentities] = useState<Identity[]>([])
    const [addressAndPublicKey, setAddressAndPublicKey] = useState<{
        address: string;
        publicKey: string;
    } | null>(null)
    const [transaction, setTransaction] = useState<unknown | null>(null)

    const { contract } = useAbstractAccountContract()
    const { toast } = useToast()
    const { networkId, signerContract, infuraRpcUrl, abstractAccountContract } = useEnv()

    const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
        defaultValues: {
            accountId: "",
            contractId: "",
            to: "",
            value: "",
            actAs: false,
            chain: "evm",
            selectedIdentity: undefined
        }
    })

    const actAs = watch("actAs")
    const accountId = watch("accountId")
    const selectedChain = watch("chain")
    const selectedIdentity = watch("selectedIdentity")

    const chainSigContract = useMemo(() => {
        if (!contract) return null;

        return new utils.chains.near.ChainSignatureContract({
            networkId: networkId as "mainnet" | "testnet",
            contractId: signerContract,
        })
    }, [contract, networkId, signerContract])

    const chains = useMemo(() => {
        if (!chainSigContract) return null;

        return {
            evm: new EVM({
                rpcUrl: infuraRpcUrl,
                contract: chainSigContract,
            }),
            btc: new Bitcoin({
                network: "testnet",
                btcRpcAdapter: new BTCRpcAdapters.Mempool('https://mempool.space/testnet/api'),
                contract: chainSigContract,
            }),
            osmosis: new Cosmos({
                chainId: "osmo-test-5",
                contract: chainSigContract,
            }),
        }
    }, [chainSigContract, infuraRpcUrl])

    useEffect(() => {
        async function deriveAddress() {
            if (!chains || !accountId || !selectedIdentity) return;

            try {
                let addressAndPublicKey: {
                    address: string;
                    publicKey: string;
                };
                const path = `${AbstractAccountContractBuilder.path.getPath(JSON.parse(selectedIdentity))},`
                console.log({ path })
                switch (selectedChain) {
                    case "evm": {
                        addressAndPublicKey = await chains.evm.deriveAddressAndPublicKey(abstractAccountContract, path)
                        break;
                    }
                    case "btc": {
                        addressAndPublicKey = await chains.btc.deriveAddressAndPublicKey(abstractAccountContract, path)
                        break;
                    }
                    case "osmo": {
                        addressAndPublicKey = await chains.osmosis.deriveAddressAndPublicKey(abstractAccountContract, path)
                        break;
                    }
                }
                setAddressAndPublicKey(addressAndPublicKey)
            } catch (err) {
                console.error("Error deriving address:", err)
            }
        }
        deriveAddress()
    }, [abstractAccountContract, accountId, chains, selectedChain, selectedIdentity])

    useEffect(() => {
        async function fetchIdentities() {
            if (!contract || !accountId) return;
            try {
                const account = await contract.getAccountById({ account_id: accountId });
                if (account) {
                    setAvailableIdentities(account.identities.map(i => i.identity));
                }
            } catch (err) {
                toast({
                    title: "Error",
                    description: err instanceof Error ? err.message : "Failed to fetch account identities",
                    variant: "destructive",
                });
            }
        }
        fetchIdentities();
    }, [contract, accountId, toast]);

    if (!contract) {
        return <div>Loading...</div>
    }

    const onSubmit = async (data: FormValues) => {
        if (!chains || !selectedIdentity || !addressAndPublicKey) {
            toast({
                title: "Error",
                description: "Please select an identity to use for signing",
                variant: "destructive",
            });
            return;
        }

        try {
            let mpcPayloads;

            switch (data.chain) {
                case "evm": {
                    const txData = await chains.evm.prepareTransactionForSigning({
                        from: addressAndPublicKey?.address as `0x${string}`,
                        to: data.to as `0x${string}`,
                        value: BigInt(data.value),
                    })
                    setTransaction(txData.transaction)
                    mpcPayloads = txData.mpcPayloads
                    break;
                }
                case "btc": {
                    const txData = await chains.btc.prepareTransactionForSigning({
                        publicKey: addressAndPublicKey?.publicKey,
                        from: addressAndPublicKey?.address,
                        to: data.to,
                        value: data.value,
                    })
                    setTransaction(txData.transaction)
                    mpcPayloads = txData.mpcPayloads
                    break;
                }
                case "osmo": {
                    const txData = await chains.osmosis.prepareTransactionForSigning({
                        address: addressAndPublicKey?.address,
                        publicKey: addressAndPublicKey?.publicKey,
                        messages: [{
                            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                            value: {
                                fromAddress: addressAndPublicKey?.address,
                                toAddress: data.to,
                                amount: [{ denom: "uosmo", amount: data.value }],
                            },
                        }],
                        memo: "Transaction from NEAR",
                    })
                    setTransaction(txData.transaction)
                    mpcPayloads = txData.mpcPayloads
                    break;
                }
            }

            const account = await contract.getAccountById({ account_id: data.accountId })
            if (!account) {
                toast({
                    title: "Error",
                    description: "Account not found",
                    variant: "destructive",
                });
                return;
            }

            const selectedIdentityObj = JSON.parse(selectedIdentity) as Identity;

            const userOpTransaction = AbstractAccountContractBuilder.transaction.sign({
                accountId: data.accountId,
                nonce: account.nonce,
                payloads: {
                    contract_id: data.contractId,
                    payloads: [{
                        path: "",
                        key_version: 0,
                        payload: mpcPayloads[0]
                    }]
                }
            });

            const userOp: UserOperation = {
                auth: {
                    identity: selectedIdentityObj,
                    credentials: {
                        token: "", // This will be filled by the auth process
                    },
                },
                transaction: userOpTransaction,
            };

            // If act-as is enabled and an identity is selected, add it to the transaction
            if (data.actAs && data.actAsIdentity) {
                const actAsIdentity = availableIdentities.find(
                    i => JSON.stringify(i) === data.actAsIdentity
                );
                if (actAsIdentity) {
                    userOp.act_as = actAsIdentity;
                }
            }

            setAuthProps({
                accountId: data.accountId,
                transaction: {
                    account_id: data.accountId,
                    nonce: account.nonce,
                    action: userOpTransaction.action,
                },
                userOp,
            })
            setAuthModalOpen(true)
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to create transaction",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="flex justify-center items-center h-full">
            {authProps &&
                <AuthModal
                    isOpen={authModalOpen}
                    onClose={() => setAuthModalOpen(false)} {...authProps}
                    onSuccess={async (result) => {
                        if (!chains) throw new Error("Chains not initialized")

                        let txHash: string | undefined;
                        const rsv = utils.cryptography.toRSV(result as MPCSignature)
                        if (selectedChain == "evm") {
                            const tx = chains.evm.attachTransactionSignature({ transaction: transaction as EVMUnsignedTransaction, mpcSignatures: [rsv] })
                            txHash = await chains?.evm.broadcastTx(tx)
                        } else if (selectedChain == "btc") {
                            const tx = chains.btc.attachTransactionSignature({ transaction: transaction as BTCUnsignedTransaction, mpcSignatures: [rsv] })
                            txHash = await chains?.btc.broadcastTx(tx)
                        } else if (selectedChain == "osmo") {
                            const tx = chains.osmosis.attachTransactionSignature({ transaction: transaction as CosmosUnsignedTransaction, mpcSignatures: [rsv] })
                            txHash = await chains?.osmosis.broadcastTx(tx)
                        }
                        console.log({ txHash })
                    }}
                />}
            <Card className="w-full md:max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Create Transaction</CardTitle>
                    <CardDescription className="text-center">Build and submit transactions to the contract</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="accountId">Account ID</Label>
                            <Input id="accountId" {...register("accountId")} />
                        </div>
                        {addressAndPublicKey && (
                            <div>
                                <Label>Derived {selectedChain.toUpperCase()} Address</Label>
                                <div className="p-2 bg-gray-100 rounded">{addressAndPublicKey.address}</div>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="chain">Chain</Label>
                            <Select
                                onValueChange={(value) => setValue("chain", value as "evm" | "btc" | "osmo")}
                                defaultValue="evm"
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select chain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="evm">Ethereum</SelectItem>
                                    <SelectItem value="btc">Bitcoin</SelectItem>
                                    <SelectItem value="osmo">Osmosis</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="identity">Signing Identity</Label>
                            <Select
                                onValueChange={(value) => setValue("selectedIdentity", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select identity for signing" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableIdentities.map((identity, index) => (
                                        <SelectItem
                                            key={index}
                                            value={JSON.stringify(identity)}
                                        >
                                            {getIdentityDisplayName(identity)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="contractId">Contract ID</Label>
                            <Input id="contractId" {...register("contractId")} />
                        </div>
                        <div>
                            <Label htmlFor="to">To</Label>
                            <Input id="to" {...register("to")} />
                        </div>
                        <div>
                            <Label htmlFor="value">Value</Label>
                            <Input id="value" {...register("value")} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="actAs"
                                checked={actAs}
                                onChange={(e) => setValue("actAs", e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="actAs">Act as another identity</Label>
                        </div>
                        {actAs && availableIdentities.length > 0 && (
                            <div>
                                <Label htmlFor="actAsIdentity">Select Identity</Label>
                                <Select
                                    onValueChange={(value) => setValue("actAsIdentity", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an identity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableIdentities.map((identity, index) => (
                                            <SelectItem
                                                key={index}
                                                value={JSON.stringify(identity)}
                                            >
                                                {getIdentityDisplayName(identity)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {actAs && availableIdentities.length === 0 && (
                            <div className="text-sm text-destructive">
                                No identities with act-as permission available
                            </div>
                        )}
                        <Button type="submit" className="w-full">
                            Submit Transaction
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

function getIdentityDisplayName(identity: Identity): string {
    if ("WebAuthn" in identity) {
        return `Passkey (${identity.WebAuthn.key_id.slice(0, 8)}...)`;
    }
    if ("OIDC" in identity) {
        const oidc = identity.OIDC;
        return `${oidc.issuer} (${oidc.email || oidc.sub})`;
    }
    if ("Wallet" in identity) {
        const wallet = identity.Wallet;
        return `${wallet.wallet_type} (${wallet.public_key.slice(0, 8)}...)`;
    }
    return "Unknown Identity";
}
