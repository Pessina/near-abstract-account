// TODO: This code was mostly copied from the o1js examples: https://github.com/o1-labs/o1js/blob/main/src/examples/crypto/rsa/rsa.ts
// Check the repo license and include on this repo also

import { verify, ZkProgram } from "o1js";
import { Bigint2048, rsaVerify65537 } from "./rsa";
import {
  decodeAndValidateToken,
  fetchMatchingPublicKey,
  constructPaddedMessage,
  base64UrlDecode,
} from "../rsa/utils";
import crypto from "crypto";
import * as o1jslib from "o1js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import sexp from "s-expression";

async function initializeBindingsLazy() {
  try {
    await o1jslib.initializeBindings();

    console.log(globalThis.plonk_wasm);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const proofToRust = (globalThis as any).__snarkyTsBindings.rustConversion(
      (globalThis as any).plonk_wasm
    ).fq.proofToRust;

    console.log({ proofToRust });

    return {
      proofToRust,
    };
  } catch (e) {
    console.error("Failed to initialize bindings", e);
  }
}

/**
 * Verifies a Google JWT OIDC token using RSA signature verification within a ZK circuit.
 * @param token - The JWT token to verify.
 */
export async function verifyRSAZK(token: string): Promise<void> {
  await initializeBindingsLazy();

  const rsaZkProgram = ZkProgram({
    name: "rsa-verify",
    methods: {
      verifyRsa65537: {
        privateInputs: [Bigint2048, Bigint2048, Bigint2048],
        async method(
          message: Bigint2048,
          signature: Bigint2048,
          modulus: Bigint2048
        ) {
          rsaVerify65537(message, signature, modulus);
        },
      },
    },
  });

  const { verifyRsa65537 } = await rsaZkProgram.analyzeMethods();
  console.log(verifyRsa65537.summary());

  console.time("compile");
  const compiledRsaZkProgram = await rsaZkProgram.compile({
    forceRecompile: false,
  });
  console.timeEnd("compile");

  console.time("generate RSA parameters and inputs from Google token");
  const { header, signedData, signatureB64 } = await decodeAndValidateToken(
    token
  );
  const jwk = await fetchMatchingPublicKey(header.kid);
  const nBuffer = base64UrlDecode(jwk.n);
  const nBigInt = BigInt(`0x${nBuffer.toString("hex")}`);
  const signatureBuffer = base64UrlDecode(signatureB64);
  const signatureBigInt = BigInt(`0x${signatureBuffer.toString("hex")}`);
  const signedDataBytes = Buffer.from(signedData, "utf8");
  const messageHashBytes = crypto
    .createHash("sha256")
    .update(signedDataBytes)
    .digest();
  const modulusLength = nBuffer.length;
  const paddedMessage = constructPaddedMessage(messageHashBytes, modulusLength);
  if (paddedMessage.length !== modulusLength) {
    throw new Error("Encoded message length does not match modulus length");
  }
  const messageForCircuit = BigInt(`0x${paddedMessage.toString("hex")}`);
  const message = Bigint2048.from(messageForCircuit);
  const signatureZK = Bigint2048.from(signatureBigInt);
  const modulus = Bigint2048.from(nBigInt);
  console.timeEnd("generate RSA parameters and inputs from Google token");

  console.time("prove");
  const { proof } = await rsaZkProgram.verifyRsa65537(
    message,
    signatureZK,
    modulus
  );
  console.timeEnd("prove");

  console.time("verify");
  const isValid = await rsaZkProgram.verify(proof);
  console.timeEnd("verify");

  console.log("isValid", isValid);

  const isValid2 = await verify(
    proof.toJSON(),
    compiledRsaZkProgram.verificationKey
  );
  console.log("isValid2", isValid2);

  const ret = await initializeBindingsLazy();

  if (ret) {
    const { proofToRust } = ret;
    const proofBase64 = proof.toJSON().proof;
    const proofString = Buffer.from(proofBase64, "base64").toString();
    console.log("Proof as string:", proofString);
    const sexpProof = sexp(proofString);
    console.log("S-expression proof:", sexpProof);
    const rustProof = proofToRust(sexpProof);
    console.log("Rust proof:", rustProof);

    console.log({
      vk: compiledRsaZkProgram.verificationKey,
      proof: proof.toJSON(),
    });
  }
}
