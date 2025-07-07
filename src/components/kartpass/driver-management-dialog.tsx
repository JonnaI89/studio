"use client";

import { useState } from "react";
import type { Driver } from "@/lib/types";
import { updateDriver, deleteDriver, createDriverAndUser } from "@/services/driver-service";
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
import { UserPlus, Download, LoaderCircle, Trash2, ArrowLeft } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface DriverManagementDialogProps {
  drivers: Driver[];
  onDatabaseUpdate: () => void;
}

export function DriverManagementDialog({ drivers, onDatabaseUpdate }: DriverManagementDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleEdit = (driver: Driver) => {
    setDriverToEdit(driver);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (driver: Driver) => {
    setDriverToDelete(driver);
  };

  const handleAddNew = () => {
    setDriverToEdit(null);
    setIsFormOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    setIsDeleting(true);
    try {
      // Note: This does not delete the Firebase Auth user, only the Firestore profile.
      // This is a limitation of not having a working Admin SDK.
      await deleteDriver(driverToDelete.id);
      toast({
        title: "Fører Slettet",
        description: `${driverToDelete.name} har blitt fjernet fra databasen. Selve innloggingen er ikke slettet.`,
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

  const handleImport = async () => {
    if (!confirm("Denne funksjonen er midlertidig deaktivert.")) {
      return;
    }
  };

  const handleSave = async (driverData: Omit<Driver, 'id' | 'role'>, id?: string) => {
    try {
      if (driverToEdit && id) {
        // This is an update to an existing driver.
        const driverToUpdate = { ...driverToEdit, ...driverData };
        await updateDriver(driverToUpdate);
        toast({
            title: `Fører oppdatert`,
            description: `${driverData.name} er lagret i databasen.`,
        });
      } else {
        // This is a new driver registration.
        if (!driverData.email) {
            toast({
                variant: "destructive",
                title: "E-post er påkrevd",
                description: "E-post må fylles ut for å opprette en ny fører.",
            });
            return;
        }

        if (drivers.some(d => d.rfid === driverData.rfid && d.rfid)) {
          toast({
            variant: "destructive",
            title: "RFID Finnes Allerede",
            description: "En fører med denne RFID-brikken finnes allerede.",
          });
          return;
        }

        const newDriver = await createDriverAndUser(driverData);
        
        toast({
            title: 'Fører Opprettet!',
            description: `Profil for ${newDriver.name} er opprettet.`,
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
                 <Button onClick={handleImport} variant="outline" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Importer fra Google Sheet
                </Button>
                <Button onClick={handleAddNew}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrer ny fører
                </Button>
            </div>
        </div>
        <div className="flex-1 min-h-0">
          <DriversTable drivers={drivers} onEdit={handleEdit} onDelete={handleOpenDeleteDialog} />
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-xl">
                 <DialogHeader>
                    <DialogTitle>{driverToEdit ? 'Rediger Fører' : 'Registrer Ny Fører'}</DialogTitle>
                    <DialogDescription>
                        {driverToEdit ? 'Oppdater informasjonen for føreren.' : 'Fyll ut detaljene for den nye føreren.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <DriverForm
                      driverToEdit={driverToEdit}
                      onSave={handleSave}
                      closeDialog={() => setIsFormOpen(false)}
                      isRestrictedView={false}
                  />
                </ScrollArea>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!driverToDelete} onOpenChange={(isOpen) => !isOpen && setDriverToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Dette vil permanent slette profilen for <span className="font-bold">{driverToDelete?.name}</span> fra databasen. Selve innloggingskontoen blir ikke fjernet. Handlingen kan ikke angres.
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
