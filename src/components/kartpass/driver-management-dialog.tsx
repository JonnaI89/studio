
"use client";

import { useState } from "react";
import type { Driver, DriverProfile } from "@/lib/types";
import { addNewDriver, deleteDriver as deleteServerDriver, updateDriver } from "@/services/driver-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DriversTable } from "./drivers-table";
import { DriverForm } from "./driver-form";
import { UserPlus, LoaderCircle, Trash2, ArrowLeft } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface DriverManagementDialogProps {
  profiles: DriverProfile[];
  onDatabaseUpdate: () => void;
}

type AddMode = "new" | "existing";

export function DriverManagementDialog({ profiles, onDatabaseUpdate }: DriverManagementDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<{ driver: Driver; profileId: string } | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<{ driver: Driver; profileId: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("new");
  const [existingEmail, setExistingEmail] = useState("");
  const { toast } = useToast();

  const handleEdit = (driver: Driver, profileId: string) => {
    setDriverToEdit({ driver, profileId });
    setAddMode("new"); // Not relevant for edit, but reset state
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (driver: Driver, profileId: string) => {
    setDriverToDelete({ driver, profileId });
  };

  const handleAddNew = () => {
    setDriverToEdit(null);
    setAddMode("new");
    setExistingEmail("");
    setIsFormOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    setIsDeleting(true);
    try {
      await deleteServerDriver(driverToDelete.profileId, driverToDelete.driver.id);
      toast({
        title: "Fører Slettet",
        description: `${driverToDelete.driver.name} har blitt fjernet fra databasen.`,
      });
      onDatabaseUpdate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sletting Feilet",
        description: (error as Error).message || "En ukjent feil oppsto.",
      });
    } finally {
      setIsDeleting(false);
      setDriverToDelete(null);
    }
  };

  const handleSave = async (driverData: Omit<Driver, 'id'>, id?: string) => {
    setIsSaving(true);
    try {
      if (driverToEdit) {
        // This is an update to an existing driver.
        const driverToUpdate: Driver = { ...driverToEdit.driver, ...driverData, id: driverToEdit.driver.id };
        await updateDriver(driverToEdit.profileId, driverToUpdate);
        toast({
            title: `Fører oppdatert`,
            description: `${driverData.name} er lagret i databasen.`,
        });
      } else {
        // This is a new driver registration.
        if (addMode === 'new' && !driverData.email) {
            toast({ variant: "destructive", title: "E-post er påkrevd", description: "E-post må fylles ut for å opprette en ny familieprofil."});
            setIsSaving(false);
            return;
        }
        if (addMode === 'existing' && !existingEmail) {
            toast({ variant: "destructive", title: "E-post er påkrevd", description: "E-post må fylles ut for å finne en eksisterende profil."});
            setIsSaving(false);
            return;
        }

        await addNewDriver(driverData, addMode === 'existing' ? existingEmail : driverData.email);
        
        toast({
            title: 'Fører Opprettet!',
            description: `Profil for ${driverData.name} er opprettet/oppdatert.`,
        });
      }

      onDatabaseUpdate();
      setIsFormOpen(false);
      setDriverToEdit(null);

    } catch (error) {
       const errorMessage = (error as Error).message;
       toast({
        variant: 'destructive',
        title: 'Lagring feilet',
        description: errorMessage || 'En ukjent feil oppsto.',
      });
    } finally {
        setIsSaving(false);
    }
  };


  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="flex justify-between items-center border-b pb-4">
            <DialogClose asChild>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tilbake til skanner
                </Button>
            </DialogClose>
            <div className="flex items-center gap-2">
                <Button onClick={handleAddNew}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrer ny fører
                </Button>
            </div>
        </div>
        <div className="flex-1 min-h-0">
          <DriversTable profiles={profiles} onEdit={handleEdit} onDelete={handleOpenDeleteDialog} />
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-xl">
                 <DialogHeader>
                    <DialogTitle>{driverToEdit ? 'Rediger Fører' : 'Registrer Ny Fører'}</DialogTitle>
                    <DialogDescription>
                        {driverToEdit ? 'Oppdater informasjonen for føreren.' : 'Fyll ut detaljene for den nye føreren.'}
                    </DialogDescription>
                </DialogHeader>
                {!driverToEdit && (
                    <div className="p-4 border bg-muted/50 rounded-lg">
                        <RadioGroup defaultValue="new" value={addMode} onValueChange={(value: AddMode) => setAddMode(value)}>
                            <Label className="font-medium">Type registrering</Label>
                            <div className="flex items-center space-x-2 pt-2">
                                <RadioGroupItem value="new" id="r1" />
                                <Label htmlFor="r1">Ny familie/bruker</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="existing" id="r2" />
                                <Label htmlFor="r2">Søsken (legg til i eksisterende familie)</Label>
                            </div>
                        </RadioGroup>
                        {addMode === 'existing' && (
                             <div className="mt-4">
                                <Label htmlFor="existing-email">E-post til foresatt</Label>
                                <Input 
                                    id="existing-email"
                                    type="email"
                                    placeholder="Skriv inn e-posten til den eksisterende profilen" 
                                    value={existingEmail}
                                    onChange={(e) => setExistingEmail(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        )}
                    </div>
                )}
                <ScrollArea className="max-h-[60vh] pr-4">
                  <DriverForm
                      driverToEdit={driverToEdit?.driver}
                      onSave={handleSave}
                      closeDialog={() => setIsFormOpen(false)}
                      isRestrictedView={false}
                      addMode={driverToEdit ? undefined : addMode}
                  />
                </ScrollArea>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!driverToDelete} onOpenChange={(isOpen) => !isOpen && setDriverToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Dette vil permanent slette profilen for <span className="font-bold">{driverToDelete?.driver.name}</span> fra databasen. Selve innloggingskontoen blir ikke fjernet. Handlingen kan ikke angres.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
                    <AlertDialogAction 
                        disabled={isDeleting} 
                        onClick={handleConfirmDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Ja, slett føreren
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
