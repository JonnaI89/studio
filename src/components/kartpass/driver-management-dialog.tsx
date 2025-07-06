"use client";

import { useState } from "react";
import type { Driver } from "@/lib/types";
import { addDriver, updateDriver, deleteDriver } from "@/services/driver-service";
import { createAuthUser } from "@/services/admin-service";
import { importFromSheetsToFirebase } from "@/services/import-service";
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
import { format } from "date-fns";
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
      await deleteDriver(driverToDelete.id);
      toast({
        title: "Fører Slettet",
        description: `${driverToDelete.name} har blitt fjernet fra databasen.`,
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
    if (!confirm("Er du sikker på at du vil importere alle førere fra Google Sheet? Dette kan overskrive eksisterende data i Firebase med samme ID.")) {
      return;
    }
    setIsImporting(true);
    try {
        const result = await importFromSheetsToFirebase();
        if (result.success) {
            toast({
                title: "Import Vellykket",
                description: `${result.count} førere ble importert fra Google Sheets til Firebase.`,
            });
            onDatabaseUpdate(); // Refresh the list
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Import Feilet",
            description: (error as Error).message || "En ukjent feil oppsto under importen.",
        });
    } finally {
        setIsImporting(false);
    }
  };

  const handleSave = async (driverData: Omit<Driver, 'id'>, id?: string) => {
    try {
      if (driverToEdit && id) {
        const wasEmailAdded = !driverToEdit.email && driverData.email;
        
        if (wasEmailAdded && driverData.email) {
            const password = format(new Date(driverData.dob), "ddMMyyyy");
            const userRecord = await createAuthUser(driverData.email, password);

            const newDriverWithAuth: Driver = {
                ...driverToEdit,
                ...driverData,
                id: userRecord.uid,
                rfid: driverData.rfid || driverToEdit.rfid,
            };
            
            await addDriver(newDriverWithAuth);
            await deleteDriver(id); // Remove the old temporary profile

        } else {
            const driverToUpdate = { ...driverData, id: id };
            await updateDriver(driverToUpdate);
        }

      } else {
        if (!driverData.email) {
            toast({
                variant: "destructive",
                title: "E-post er påkrevd",
                description: "E-post må fylles ut for å opprette en ny fører.",
            });
            return;
        }

        if (drivers.some(d => d.rfid === driverData.rfid)) {
          toast({
            variant: "destructive",
            title: "RFID Finnes Allerede",
            description: "En fører med denne RFID-brikken finnes allerede.",
          });
          return;
        }

        const password = format(new Date(driverData.dob), "ddMMyyyy");
        const userRecord = await createAuthUser(driverData.email, password);

        const newDriver: Driver = {
            ...driverData,
            id: userRecord.uid,
        };
        await addDriver(newDriver);
      }

      toast({
        title: `Fører ${driverToEdit ? 'oppdatert' : 'lagt til'}`,
        description: `${driverData.name} er lagret i databasen.`,
      });

      onDatabaseUpdate();
      setIsFormOpen(false);
      setDriverToEdit(null);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lagring feilet',
        description: (error as Error).message || 'En ukjent feil oppsto.',
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
                 <Button onClick={handleImport} variant="outline" disabled={isImporting}>
                    {isImporting ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isImporting ? 'Importerer...' : 'Importer fra Google Sheet'}
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
