import { AuthIdentity } from "../AuthIdentity";
import { P256Credential } from "./types";
import { parseSignature } from "./utils";
import cbor from "cbor";
import crypto from "crypto";
import { toHex } from "viem";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { WebAuthnAuthIdentity } from "@/contracts/AbstractAccountContract/types/auth";
import { AbstractAccountContractBuilder } from "@/contracts/AbstractAccountContract/utils/auth";

export class WebAuthn extends AuthIdentity<
  WebAuthnAuthIdentity,
  P256Credential
> {
  private static _generateRandomBytes(): Buffer {
    return crypto.randomBytes(16);
  }

  private static isSupportedByBrowser(): boolean {
    return (
      window?.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === "function"
    );
  }

  async getAuthIdentity({
    id,
  }: {
    id: string;
  }): Promise<WebAuthnAuthIdentity | null> {
    WebAuthn.isSupportedByBrowser();

    const options: PublicKeyCredentialCreationOptions = {
      timeout: 60000,
      rp: {
        name: "passkeys-4337/smart-wallet",
        id: window.location.hostname,
      },
      user: {
        id: WebAuthn._generateRandomBytes(),
        name: id,
        displayName: id,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
      authenticatorSelection: {
        requireResidentKey: true,
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
      attestation: "direct",
      challenge: Uint8Array.from("random-challenge", (c) => c.charCodeAt(0)),
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
    const decodedAttestationObj = cbor.decode(cred.response.attestationObject);
    const authData = parseAuthenticatorData(decodedAttestationObj.authData);
    const publicKey = cbor.decode(
      authData?.credentialPublicKey?.buffer as ArrayBuffer
    );
    const x = toHex(publicKey.get(-2));
    const y = toHex(publicKey.get(-3));

    // Create compressed public key by prepending 0x02 or 0x03 based on y coordinate
    const yLastBit = parseInt(y.slice(-1), 16) % 2;
    const prefix = yLastBit === 0 ? "0x02" : "0x03";
    const compressedPublicKey = prefix + x.slice(2); // Remove '0x' from x before concatenating

    return AbstractAccountContractBuilder.authIdentity.webauthn({
      key_id: toHex(new Uint8Array(cred.rawId)),
      compressed_public_key: compressedPublicKey,
    });
  }

  async sign(message: string): Promise<P256Credential | null> {
    WebAuthn.isSupportedByBrowser();

    const challenge = new Uint8Array(
      await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(message)
      )
    );

    const options: PublicKeyCredentialRequestOptions = {
      timeout: 60000,
      challenge,
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

    const decodedClientData = utf8Decoder.decode(cred.response.clientDataJSON);
    const clientDataObj = JSON.parse(decodedClientData);

    const authenticatorData = toHex(
      new Uint8Array(cred.response.authenticatorData)
    );
    const signature = parseSignature(new Uint8Array(cred?.response?.signature));

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
}
