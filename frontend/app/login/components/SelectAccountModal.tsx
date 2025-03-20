import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DialogHeader } from "@/components/ui/dialog";

type SelectAccountModalProps = {
  accountSelectOpen: boolean;
  setAccountSelectOpen: (open: boolean) => void;
  availableAccounts: string[];
  handleSelectAccount: (accountId: string) => void;
};

const SelectAccountModal: React.FC<SelectAccountModalProps> = ({
  accountSelectOpen,
  setAccountSelectOpen,
  availableAccounts,
  handleSelectAccount,
}) => {
  return (
    <Dialog open={accountSelectOpen} onOpenChange={setAccountSelectOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Account</DialogTitle>
          <DialogDescription>
            Multiple accounts found. Please select which one you want to use.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {availableAccounts.map((accountId) => (
            <Button
              key={accountId}
              onClick={() => handleSelectAccount(accountId)}
              variant="outline"
            >
              {accountId}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelectAccountModal;
