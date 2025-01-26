"use client";

import { ChevronRight, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PublicKey } from "@/contracts/OIDCAuthContract/OIDCAuthContract";
import { useOIDCAuthContract } from "@/contracts/OIDCAuthContract/useOIDCAuthContract";
import { useToast } from "@/hooks/use-toast";

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

interface KeyInfoProps {
  label: string;
  value: string;
  canCopy?: boolean;
  onCopy?: (text: string) => Promise<void>;
  className?: string;
}

const KeyInfo = ({ label, value, canCopy = false, onCopy, className = "" }: KeyInfoProps) => (
  <div className={`flex justify-between items-center py-1 ${className}`}>
    <span className="text-sm font-medium">{label}:</span>
    <div className="flex items-center space-x-2">
      <code className={`bg-muted px-2 py-1 rounded text-sm ${label === "Modulus (n)" ? "truncate max-w-[300px]" : ""}`}>
        {value}
      </code>
      {canCopy && onCopy && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCopy(value)}
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
);

export default function UpdateOIDCKeys() {
  const [keys, setKeys] = useState<OIDCKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { contract } = useOIDCAuthContract();
  const { toast } = useToast();

  const handleGetKeys = async () => {
    if (!contract) return;
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleUpdateKeys = async () => {
    if (!contract) return;
    try {
      setIsUpdating(true);

      const [googleRes, auth0Res, facebookRes] = await Promise.all([
        fetch('/admin/api/oidc/google/keys'),
        fetch('/admin/api/oidc/auth0/keys'),
        fetch('/admin/api/oidc/facebook/keys')
      ]);

      const [googleData, auth0Data, facebookData] = await Promise.all([
        googleRes.json(),
        auth0Res.json(),
        facebookRes.json()
      ]) as [JWKSResponse, JWKSResponse, JWKSResponse];

      const transformKeys = (keys: JWKSResponse['keys']) =>
        keys.map(key => ({
          kid: key.kid,
          n: key.n,
          e: key.e,
          alg: key.alg,
          kty: key.kty,
          use: key.use
        }));

      await Promise.all([
        contract.updateKeys('https://accounts.google.com', transformKeys(googleData.keys)),
        contract.updateKeys('https://dev-um3ne30lucm6ehqq.us.auth0.com/', transformKeys(auth0Data.keys)),
        contract.updateKeys('https://www.facebook.com', transformKeys(facebookData.keys))
      ]);

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
      setIsUpdating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Value copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
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
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Fetch Keys
            </Button>
            <Button
              onClick={handleUpdateKeys}
              disabled={isUpdating}
              variant="default"
            >
              {isUpdating ? (
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
              <Collapsible key={issuer}>
                <div className="flex items-center space-x-4 py-2">
                  <CollapsibleTrigger className="flex items-center hover:text-primary transition-colors">
                    <ChevronRight className="h-4 w-4" />
                    <span className="ml-2 font-medium">{issuer}</span>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="pl-6 space-y-4">
                    {publicKeys.map((key) => (
                      <div key={key.kid} className="space-y-2 border-b pb-4 last:border-b-0">
                        <KeyInfo label="Key ID" value={key.kid} canCopy onCopy={copyToClipboard} />
                        <KeyInfo label="Algorithm" value={key.alg} />
                        <KeyInfo label="Key Type" value={key.kty} />
                        <KeyInfo label="Use" value={key.use} />
                        <KeyInfo label="Modulus (n)" value={key.n} canCopy onCopy={copyToClipboard} />
                        <KeyInfo label="Exponent (e)" value={key.e} canCopy onCopy={copyToClipboard} />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
