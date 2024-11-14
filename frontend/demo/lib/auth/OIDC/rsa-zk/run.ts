import { ZkProgram } from "o1js";
import { Bigint2048, rsaVerify65537 } from "./rsa";
import { decodeAndValidateToken, fetchMatchingPublicKey } from "../rsa/utils";
import { Buffer } from "buffer";
import crypto from "crypto";

export const verifyRSAZK = async (token: string) => {
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
  const forceRecompileEnabled = false;
  await rsaZkProgram.compile({ forceRecompile: forceRecompileEnabled });
  console.timeEnd("compile");

  console.time("generate RSA parameters and inputs from Google token");
  // Decode and validate the token
  const { header, signedData, signatureB64 } = await decodeAndValidateToken(
    token
  );

  // Fetch Google's public key (JWK)
  const jwk = await fetchMatchingPublicKey(header.kid);
  const nBigInt = BigInt("0x" + Buffer.from(jwk.n, "base64").toString("hex"));
  const signatureBigInt = BigInt(
    "0x" + Buffer.from(signatureB64, "base64").toString("hex")
  );

  // Compute the message hash as bytes
  const signedDataBytes = Buffer.from(signedData, "utf8");
  const messageHashBytes = crypto
    .createHash("sha256")
    .update(signedDataBytes)
    .digest();

  // DER encoding prefix for SHA-256 algorithm identifier
  const DER_SHA256_PREFIX = Buffer.from([
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03,
    0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
  ]);

  // Construct the encoded message (T)
  const tLen = DER_SHA256_PREFIX.length + messageHashBytes.length;
  const derEncoded = Buffer.concat([DER_SHA256_PREFIX, messageHashBytes]);

  // Determine the modulus length in bytes (k)
  const modulusHex = nBigInt.toString(16);
  const k = Math.ceil(modulusHex.length / 2);

  // Construct the padding string PS
  const psLength = k - tLen - 3;
  if (psLength < 8) {
    throw new Error("Intended encoded message length too short");
  }
  const padding = Buffer.alloc(psLength, 0xff);

  // Construct the padded message EM = 0x00 || 0x01 || PS || 0x00 || T
  const paddedMessage = Buffer.concat([
    Buffer.from([0x00, 0x01]),
    padding,
    Buffer.from([0x00]),
    derEncoded,
  ]);

  if (paddedMessage.length !== k) {
    throw new Error("Encoded message length does not match modulus length");
  }

  // Convert final padded message to bigint for ZK circuit
  const messageForCircuit = BigInt("0x" + paddedMessage.toString("hex"));

  // Create circuit inputs, ensuring proper 2048-bit number representation
  const message = Bigint2048.from(messageForCircuit);
  const signatureZK = Bigint2048.from(signatureBigInt);
  const modulus = Bigint2048.from(nBigInt);

  console.log("Message hash:", messageHashBytes.toString("hex"));
  console.log("Signature:", signatureBigInt.toString());
  console.log("Modulus:", nBigInt.toString());

  console.timeEnd("generate RSA parameters and inputs from Google token");

  console.time("prove");
  const { proof } = await rsaZkProgram.verifyRsa65537(
    message,
    signatureZK,
    modulus
  );
  console.timeEnd("prove");

  console.time("verify");
  await rsaZkProgram.verify(proof);
  console.timeEnd("verify");
};

// import { Provable, ZkProgram } from "o1js";
// import { Bigint2048, rsaVerify65537 } from "./rsa";
// import { sha256Bigint, generateRsaParams, rsaSign } from "./utils";

// export const verifyRSAZK = async () => {
//   const rsaZkProgram = ZkProgram({
//     name: "rsa-verify",

//     methods: {
//       verifyRsa65537: {
//         privateInputs: [Bigint2048, Bigint2048, Bigint2048],

//         async method(
//           message: Bigint2048,
//           signature: Bigint2048,
//           modulus: Bigint2048
//         ) {
//           rsaVerify65537(message, signature, modulus);
//         },
//       },
//     },
//   });

//   const { verifyRsa65537 } = await rsaZkProgram.analyzeMethods();

//   console.log(verifyRsa65537.summary());

//   console.time("compile");
//   const forceRecompileEnabled = false;
//   await rsaZkProgram.compile({ forceRecompile: forceRecompileEnabled });
//   console.timeEnd("compile");

//   console.time("generate RSA parameters and inputs (2048 bits)");
//   const input = await sha256Bigint("How are you!");
//   const params = generateRsaParams(2048);
//   const message = Bigint2048.from(input);
//   const signature = Bigint2048.from(rsaSign(input, params.d, params.n));
//   const modulus = Bigint2048.from(params.n);

//   console.log("Message:", message.toBigint().toString());
//   console.log("Signature:", signature.toBigint().toString());
//   console.log("Modulus:", modulus.toBigint().toString());

//   console.timeEnd("generate RSA parameters and inputs (2048 bits)");

//   console.time("prove");
//   const { proof } = await rsaZkProgram.verifyRsa65537(
//     message,
//     signature,
//     modulus
//   );
//   console.timeEnd("prove");

//   console.time("verify");
//   await rsaZkProgram.verify(proof);
//   console.timeEnd("verify");
// };
