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

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const rustConversion = (
      globalThis as any
    ).__snarkyTsBindings.rustConversion((globalThis as any).plonk_wasm);

    return {
      rustConversion,
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
  const { proof, auxiliaryOutput } = await rsaZkProgram.verifyRsa65537(
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
    const { rustConversion } = ret;
    // const proofBase64 = proof.toJSON().proof;
    // const proofString = Buffer.from(proofBase64, "base64").toString();
    // const sexpProof = sexp(proofString);
    // console.log("S-expression proof:", sexpProof);
    console.log(proof.proof);
    console.log(auxiliaryOutput);

    // Try all available rustConversion methods for converting proof
    // const proofData = [0, [], (proof.proof as any)[1]];
    const proofData = proof.proof as any;

    // List of all available conversion methods
    const conversionMethods = [
      {
        name: "mapMlArrayToRustVector",
        fn: rustConversion.mapMlArrayToRustVector,
      },
      { name: "wireToRust", fn: rustConversion.wireToRust },
      { name: "fieldsToRustFlat", fn: rustConversion.fieldsToRustFlat },
      { name: "fq.proofToRust", fn: rustConversion.fq.proofToRust },
      {
        name: "fq.runtimeTableCfgsToRust",
        fn: rustConversion.fq.runtimeTableCfgsToRust,
      },
      {
        name: "fq.lookupTablesToRust",
        fn: rustConversion.fq.lookupTablesToRust,
      },
      { name: "fq.pointsToRust", fn: rustConversion.fq.pointsToRust },
      { name: "fq.shiftsToRust", fn: rustConversion.fq.shiftsToRust },
      { name: "fq.vectorToRust", fn: rustConversion.fq.vectorToRust },
      { name: "fq.polyCommsToRust", fn: rustConversion.fq.polyCommsToRust },
      {
        name: "fq.runtimeTablesToRust",
        fn: rustConversion.fq.runtimeTablesToRust,
      },
      { name: "fp.proofToRust", fn: rustConversion.fp.proofToRust },
      {
        name: "fp.runtimeTableCfgsToRust",
        fn: rustConversion.fp.runtimeTableCfgsToRust,
      },
      {
        name: "fp.lookupTablesToRust",
        fn: rustConversion.fp.lookupTablesToRust,
      },
      { name: "fp.pointsToRust", fn: rustConversion.fp.pointsToRust },
      { name: "fp.shiftsToRust", fn: rustConversion.fp.shiftsToRust },
      { name: "fp.vectorToRust", fn: rustConversion.fp.vectorToRust },
      { name: "fp.polyCommsToRust", fn: rustConversion.fp.polyCommsToRust },
      {
        name: "fp.runtimeTablesToRust",
        fn: rustConversion.fp.runtimeTablesToRust,
      },
    ];

    // Try each conversion method
    for (const { name, fn } of conversionMethods) {
      try {
        const rustProof = fn(proofData);
        console.log(`${name} result:`, rustProof);
      } catch (e) {
        console.log(`Error in ${name}:`, e instanceof Error ? e.message : e);
      }
    }

    console.log({
      vk: compiledRsaZkProgram.verificationKey,
      proof: proof.toJSON(),
    });
  }
}
