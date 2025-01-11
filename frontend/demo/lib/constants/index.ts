import { SignPayloadsRequest } from "../contract/AbstractAccountContract";

export const mockTransaction = (): SignPayloadsRequest => ({
  contract_id: process.env.NEXT_PUBLIC_SIGNER_CONTRACT as string,
  payloads: [
    {
      path: "my_path",
      payload: Array(32)
        .fill(0)
        .map((_, i) => i % 10),
      key_version: 0,
    },
  ],
});
