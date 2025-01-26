"use client";

import { ChevronRight, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useOIDCAuthContract } from "@/contracts/OIDCAuthContract/useOIDCAuthContract";
import { useToast } from "@/hooks/use-toast";

type OIDCKeys = {
  google?: {
    client_id: string;
    client_secret: string;
  };
  facebook?: {
    client_id: string;
    client_secret: string;
  };
  auth0?: {
    client_id: string;
    client_secret: string;
  };
};

export default function UpdateOIDCKeys() {
  const [keys, setKeys] = useState<OIDCKeys | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { contract } = useOIDCAuthContract();
  const { toast } = useToast();

  const handleGetKeys = async () => {
    if (!contract) return;
    try {
      setIsLoading(true);
      const fetchedKeys = await contract.getKeys();
      setKeys(fetchedKeys as OIDCKeys);
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
        <CardTitle>OIDC Keys Management</CardTitle>
        <CardDescription>View and update OIDC provider keys</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
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
        </div>

        {keys && (
          <div className="space-y-4">
            {Object.entries(keys).map(([provider, providerKeys]) => (
              providerKeys && (
                <Collapsible key={provider}>
                  <div className="flex items-center space-x-4 py-2">
                    <CollapsibleTrigger className="flex items-center hover:text-primary transition-colors">
                      <ChevronRight className="h-4 w-4" />
                      <span className="ml-2 capitalize font-medium">{provider}</span>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="pl-6 space-y-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm font-medium">Client ID:</span>
                        <div className="flex items-center space-x-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {providerKeys.client_id}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(providerKeys.client_id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm font-medium">Client Secret:</span>
                        <div className="flex items-center space-x-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {providerKeys.client_secret}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(providerKeys.client_secret)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
