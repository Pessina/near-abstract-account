export const mockTransaction = (nonce: number) => ({
  receiver_id: "felipe-sandbox-account.testnet",
  nonce: nonce.toString(),
  actions: [
    { Transfer: { deposit: "10000000000000000000" } },
    // {
    //   FunctionCall: {
    //     method_name: "sign",
    //     args: JSON.stringify({
    //       request: {
    //         path: "ethereum,1",
    //         payload: Array(32).fill(0).map((_, i) => i % 10),
    //         key_version: 0
    //       }
    //     }),
    //     gas: "50000000000000",
    //     deposit: "250000000000000000000000"
    //   }
    // }
  ],
});
