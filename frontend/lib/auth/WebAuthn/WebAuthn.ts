import crypto from "crypto";

import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import cbor from "cbor";
import {
  WebAuthnCredentials,
  Identity,
  AbstractAccountContractBuilder,
} from "chainsig-aa.js";
import { toHex } from "viem";

import { IdentityClass } from "../Identity";

import { parseSignature } from "./utils";

export type WebAuthnOperation = "create" | "get";

export class WebAuthn extends IdentityClass<Identity, WebAuthnCredentials> {
  private static _generateRandomBytes(): Buffer {
    return crypto.randomBytes(16);
  }

  private static isSupportedByBrowser(): boolean {
    return (
      window?.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === "function"
    );
  }

  async getIdentity({
    id,
    operation,
  }: {
    id: string;
    operation: WebAuthnOperation;
  }): Promise<Identity> {
    WebAuthn.isSupportedByBrowser();

    if (operation === "get") {
      return (await this.sign(id)).authIdentity;
    }

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
      throw new Error("Failed to create WebAuthn credential");
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

    return AbstractAccountContractBuilder.identity.webauthn({
      key_id: toHex(new Uint8Array(cred.rawId)),
      compressed_public_key: compressedPublicKey,
    });
  }

  async sign(message: string): Promise<{
    authIdentity: Identity;
    credentials: WebAuthnCredentials;
  }> {
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
      throw new Error("Failed to sign with WebAuthn");
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

    const authIdentity = AbstractAccountContractBuilder.identity.webauthn({
      key_id: toHex(new Uint8Array(cred.rawId)),
    });

    return {
      authIdentity,
      credentials: {
        client_data: JSON.stringify({
          type: clientDataObj.type,
          challenge: clientDataObj.challenge,
          origin: clientDataObj.origin,
          crossOrigin: clientDataObj.crossOrigin,
        }),
        authenticator_data: authenticatorData,
        signature,
      },
    };
  }
}
