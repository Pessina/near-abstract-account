"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicKey } from "@/contracts/OIDCAuthContract/OIDCAuthContract";
import { useOIDCAuthContract } from "@/contracts/OIDCAuthContract/useOIDCAuthContract";
import { useToast } from "@/hooks/use-toast";

const providers = [
  {
    name: 'google',
    issuer: 'https://accounts.google.com'
  },
  {
    name: 'auth0',
    issuer: 'https://dev-um3ne30lucm6ehqq.us.auth0.com/'
  },
  {
    name: 'facebook',
    issuer: 'https://www.facebook.com'
  }
];

type OIDCKeys = {
  [issuer: string]: PublicKey[];
};

type JWKSResponse = {
  keys: Array<{
    kid: string;
    n: string;
    e: string;
    alg: string;
    kty: string;
    use: string;
  }>;
};

export default function UpdateOIDCKeys() {
  const [keys, setKeys] = useState<OIDCKeys | null>(null);
  const [loading, setLoading] = useState(false);
  const { contract } = useOIDCAuthContract();
  const { toast } = useToast();

  const handleGetKeys = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const fetchedKeys = await contract.getKeys();
      const formattedKeys = Object.fromEntries(fetchedKeys);
      setKeys(formattedKeys);
      toast({
        title: "Success",
        description: "Keys fetched successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKeys = async () => {
    if (!contract) return;
    try {
      setLoading(true);

      const responses = await Promise.all(
        providers.map(provider =>
          fetch(`/admin/api/oidc/${provider.name}/keys`)
        )
      );

      const providerData = await Promise.all(
        responses.map(res => res.json() as Promise<JWKSResponse>)
      );

      const transformKeys = (keys: JWKSResponse['keys']) =>
        keys.map(key => ({
          kid: key.kid,
          n: key.n,
          e: key.e,
          alg: key.alg,
          kty: key.kty,
          use: key.use
        }));

      await Promise.all(
        providers.map((provider, index) =>
          contract.updateKeys(
            provider.issuer,
            transformKeys(providerData[index].keys)
          )
        )
      );

      toast({
        title: "Success",
        description: "OIDC keys updated successfully",
      });

      await handleGetKeys();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OIDC Public Keys Management</CardTitle>
        <CardDescription>View and update OIDC provider public keys used for JWT verification</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-x-4">
            <Button
              onClick={handleGetKeys}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Fetch Keys
            </Button>
            <Button
              onClick={handleUpdateKeys}
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Update Keys
            </Button>
          </div>
        </div>

        {keys && (
          <div className="space-y-4">
            {Object.entries(keys).map(([issuer, publicKeys]) => (
              <div key={issuer} className="space-y-2">
                <h3 className="font-medium">{issuer}</h3>
                <div className="pl-4 space-y-2">
                  {publicKeys.map((key) => (
                    <div key={key.kid} className="p-2 bg-secondary/50 rounded-md">
                      <span className="text-sm">
                        {key.kid} ({key.alg}, {key.kty})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
