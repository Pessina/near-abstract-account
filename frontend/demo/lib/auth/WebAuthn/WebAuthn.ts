// TODO: code copied from: https://github.com/passkeys-4337/smart-wallet
// Check the license requirements and include it in the project if you still use it later

import crypto from "crypto";
import { Hex, toHex } from "viem";
import cbor from "cbor";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { ClientData, CreateCredential, P256Credential, P256Signature } from "./types";
import { parseSignature, concatUint8Arrays, hexStringToUint8Array, hexToBase64Url } from "./utils";

export class WebAuthn {
  private static _generateRandomBytes(): Buffer {
    return crypto.randomBytes(16);
  }

  public static isSupportedByBrowser(): boolean {
    console.log(
      "isSupportedByBrowser",
      window?.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === "function"
    );
    return (
      window?.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === "function"
    );
  }

  public static async platformAuthenticatorIsAvailable(): Promise<boolean> {
    if (
      !this.isSupportedByBrowser() &&
      typeof window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable !== "function"
    ) {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }

  public static async isConditionalSupported(): Promise<boolean> {
    if (
      !this.isSupportedByBrowser() &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable !==
        "function"
    ) {
      return false;
    }
    return await PublicKeyCredential.isConditionalMediationAvailable();
  }

  public static async isConditional() {
    if (
      typeof window.PublicKeyCredential !== "undefined" &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
        "function"
    ) {
      const available =
        await PublicKeyCredential.isConditionalMediationAvailable();

      if (available) {
        this.get();
      }
    }
  }

  public static async create({
    username,
  }: {
    username: string;
  }): Promise<CreateCredential | null> {
    this.isSupportedByBrowser();

    const options: PublicKeyCredentialCreationOptions = {
      timeout: 60000,
      rp: {
        name: "passkeys-4337/smart-wallet",
        id: window.location.hostname,
      },
      user: {
        id: this._generateRandomBytes(),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
      authenticatorSelection: {
        requireResidentKey: true,
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
      attestation: "direct",
      challenge: Uint8Array.from(
        "random-challenge",
        (c) => c.charCodeAt(0)
      ),
    };

    const credential = await navigator.credentials.create({
      publicKey: options,
    });

    if (!credential) {
      return null;
    }

    const cred = credential as unknown as {
      rawId: ArrayBuffer;
      response: {
        clientDataJSON: ArrayBuffer;
        attestationObject: ArrayBuffer;
      };
    };

    // Decode attestation object and get public key
    const decodedAttestationObj = cbor.decode(
      cred.response.attestationObject
    );
    const authData = parseAuthenticatorData(decodedAttestationObj.authData);
    const publicKey = cbor.decode(
      authData?.credentialPublicKey?.buffer as ArrayBuffer
    );
    const x = toHex(publicKey.get(-2));
    const y = toHex(publicKey.get(-3));

    console.log({
      x,
      y
    })


    // Create compressed public key by prepending 0x02 or 0x03 based on y coordinate
    const yLastBit = parseInt(y.slice(-1), 16) % 2;
    const prefix = yLastBit === 0 ? "0x02" : "0x03";
    const compressedPublicKey = prefix + x.slice(2); // Remove '0x' from x before concatenating

    console.log({
      x, 
      y,
      compressedPublicKey
    })

    return {
      rawId: toHex(new Uint8Array(cred.rawId)),
      compressedPublicKey
    };
  }

  public static async get(challenge?: Hex): Promise<P256Credential | null> {
    this.isSupportedByBrowser();

    const options: PublicKeyCredentialRequestOptions = {
      timeout: 60000,
      challenge: challenge
        ? Buffer.from(challenge.slice(2), "hex")
        : Uint8Array.from(
            "random-challenge",
            (c) => c.charCodeAt(0)
          ),
      rpId: window.location.hostname,
      userVerification: "preferred",
    } as PublicKeyCredentialRequestOptions;

    const credential = await window.navigator.credentials.get({
      publicKey: options,
    });

    if (!credential) {
      return null;
    }

    const cred = credential as unknown as {
      rawId: ArrayBuffer;
      response: {
        clientDataJSON: ArrayBuffer;
        authenticatorData: ArrayBuffer;
        signature: ArrayBuffer;
        userHandle: ArrayBuffer;
      };
    };

    const utf8Decoder = new TextDecoder("utf-8");

    const decodedClientData = utf8Decoder.decode(
      cred.response.clientDataJSON
    );
    const clientDataObj = JSON.parse(decodedClientData);

    const authenticatorData = toHex(
      new Uint8Array(cred.response.authenticatorData)
    );
    const signature = parseSignature(
      new Uint8Array(cred?.response?.signature)
    );

    return {
      rawId: toHex(new Uint8Array(cred.rawId)),
      clientData: {
        type: clientDataObj.type,
        challenge: clientDataObj.challenge,
        origin: clientDataObj.origin,
        crossOrigin: clientDataObj.crossOrigin,
      },
      authenticatorData,
      signature,
    };
  }

  // New method to validate the signature
  public static async validateSignature({
    compressedPublicKey,
    signature,
    authenticatorData,
    clientData,
  }: {
    compressedPublicKey: string;
    signature: P256Signature;
    authenticatorData: string;
    clientData: {
      type: string;
      challenge: string;
      origin: string;
      crossOrigin?: boolean;
    };
  }): Promise<boolean> {
    // Prepare data for verification
    const signedData = await this.prepareSignedData(authenticatorData, clientData);
    const publicKeyCryptoKey = await this.importCompressedPublicKey(compressedPublicKey);
    const signatureArray = this.prepareSignatureArray(signature);

    // Verify the signature
    const isValid = await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKeyCryptoKey,
      signatureArray,
      signedData
    );

    console.log('Signature validation result:', isValid);
    return isValid;
  }

  private static async prepareSignedData(authenticatorData: string, clientData: ClientData): Promise<Uint8Array> {
    const authenticatorDataArray = hexStringToUint8Array(authenticatorData);
    const clientDataJSON = JSON.stringify(clientData);
    const clientDataArray = new TextEncoder().encode(clientDataJSON);
    const clientDataHash = new Uint8Array(
      await window.crypto.subtle.digest("SHA-256", clientDataArray)
    );
    return concatUint8Arrays([authenticatorDataArray, clientDataHash]);
  }

  private static async importCompressedPublicKey(compressedPublicKey: string): Promise<CryptoKey> {
    // Remove '0x' prefix if present
    const cleanKey = compressedPublicKey.startsWith('0x') ? compressedPublicKey.slice(2) : compressedPublicKey;
    
    // First byte indicates if y is even (0x02) or odd (0x03)
    const x = cleanKey.slice(2);

    // Convert to base64url for JWK
    const xBase64Url = hexToBase64Url(x);

    // Create JWK with x coordinate and curve point compression
    const jwk: JsonWebKey = {
      kty: "EC",
      crv: "P-256",
      x: xBase64Url,
      // Note: y coordinate is derived by the WebCrypto API
      ext: true
    };

    return window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"]
    );
  }

  private static prepareSignatureArray(signature: P256Signature): Uint8Array {
    const rBytes = hexStringToUint8Array(signature.r);
    const sBytes = hexStringToUint8Array(signature.s);
    return concatUint8Arrays([rBytes, sBytes]);
  }
}
