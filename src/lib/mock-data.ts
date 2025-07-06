"use client";

import { useState } from "react";
import type { Driver } from "@/lib/types";
import { addDriver, updateDriver } from "@/services/driver-service";
import { importFromSheetsToFirebase } from "@/services/import-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DriversTable } from "./drivers-table";
import { DriverForm } from "./driver-form";
import { UserPlus, Download, LoaderCircle } from "lucide-react";

interface DriverManagementDialogProps {
  drivers: Driver[];
  onDatabaseUpdate: () => void;
}

export function DriverManagementDialog({ drivers, onDatabaseUpdate }: DriverManagementDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleEdit = (driver: Driver) => {
    setDriverToEdit(driver);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setDriverToEdit(null);
    setIsFormOpen(true);
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

  const handleSave = async (savedDriver: Driver) => {
    try {
      if (driverToEdit) {
        await updateDriver(savedDriver);
      } else {
        if (drivers.some(d => d.id === savedDriver.id)) {
          toast({
            variant: "destructive",
            title: "ID Finnes Allerede",
            description: "En fører med denne ID-en finnes allerede.",
          });
          return;
        }
        await addDriver(savedDriver);
      }

      toast({
        title: `Fører ${driverToEdit ? 'oppdatert' : 'lagt til'}`,
        description: `${savedDriver.name} er lagret i databasen.`,
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
    <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center border-b pb-4">
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
        <DriversTable drivers={drivers} onEdit={handleEdit} />

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="max-w-xl">
                 <DialogHeader>
                    <DialogTitle>{driverToEdit ? 'Rediger Fører' : 'Registrer Ny Fører'}</DialogTitle>
                    <DialogDescription>
                        {driverToEdit ? 'Oppdater informasjonen for føreren.' : 'Fyll ut detaljene for den nye føreren.'}
                    </DialogDescription>
                </DialogHeader>
                <DriverForm
                    driverToEdit={driverToEdit}
                    onSave={handleSave}
                    closeDialog={() => setIsFormOpen(false)}
                />
            </DialogContent>
        </Dialog>
    </div>
  );
}