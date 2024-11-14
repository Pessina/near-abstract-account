import { ZkProgram } from "o1js";
import { Bigint2048, rsaVerify65537 } from "./rsa";
import {
  decodeAndValidateToken,
  fetchMatchingPublicKey,
  constructPaddedMessage,
  base64UrlDecode,
} from "../rsa/utils";
import crypto from "crypto";

/**
 * Verifies a Google JWT OIDC token using RSA signature verification within a ZK circuit.
 * @param token - The JWT token to verify.
 */
export async function verifyRSAZK(token: string): Promise<void> {
  // Initialize the ZK Program
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

  // Compile the ZK Program
  console.time("compile");
  await rsaZkProgram.compile({ forceRecompile: false });
  console.timeEnd("compile");

  console.time("generate RSA parameters and inputs from Google token");

  // Decode and validate the token
  const { header, signedData, signatureB64 } = await decodeAndValidateToken(
    token
  );

  // Fetch Google's public key (JWK)
  const jwk = await fetchMatchingPublicKey(header.kid);

  // Decode modulus 'n' and exponent 'e'
  const nBuffer = base64UrlDecode(jwk.n);

  // Convert 'n' and 'e' to BigInt
  const nBigInt = BigInt(`0x${nBuffer.toString("hex")}`);

  // Decode signature
  const signatureBuffer = base64UrlDecode(signatureB64);
  const signatureBigInt = BigInt(`0x${signatureBuffer.toString("hex")}`);

  // Compute the message hash as bytes
  const signedDataBytes = Buffer.from(signedData, "utf8");
  const messageHashBytes = crypto
    .createHash("sha256")
    .update(signedDataBytes)
    .digest();

  // Get modulus length in bytes
  const modulusLength = nBuffer.length;

  // Construct the padded message
  const paddedMessage = constructPaddedMessage(messageHashBytes, modulusLength);

  // Verify that the padded message length matches the modulus length
  if (paddedMessage.length !== modulusLength) {
    throw new Error("Encoded message length does not match modulus length");
  }

  // Convert padded message to BigInt
  const messageForCircuit = BigInt(`0x${paddedMessage.toString("hex")}`);

  // Create circuit inputs
  const message = Bigint2048.from(messageForCircuit);
  const signatureZK = Bigint2048.from(signatureBigInt);
  const modulus = Bigint2048.from(nBigInt);

  console.timeEnd("generate RSA parameters and inputs from Google token");

  // Generate the proof
  console.time("prove");
  const { proof } = await rsaZkProgram.verifyRsa65537(
    message,
    signatureZK,
    modulus
  );
  console.timeEnd("prove");

  // Verify the proof
  console.time("verify");
  const isValid = await rsaZkProgram.verify(proof);
  console.timeEnd("verify");

  console.log("isValid", isValid);
}
