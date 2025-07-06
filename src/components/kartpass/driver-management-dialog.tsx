"use client";

import { useState } from "react";
import type { Driver } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DriversTable } from "./drivers-table";
import { DriverForm } from "./driver-form";
import { UserPlus } from "lucide-react";

interface DriverManagementDialogProps {
  drivers: Driver[];
  setDrivers: (drivers: Driver[]) => void;
}

export function DriverManagementDialog({ drivers, setDrivers }: DriverManagementDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);

  const handleEdit = (driver: Driver) => {
    setDriverToEdit(driver);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setDriverToEdit(null);
    setIsFormOpen(true);
  };

  const handleSave = (savedDriver: Driver) => {
    if (driverToEdit) {
      // Update existing driver
      const updatedDrivers = drivers.map(d => d.id === savedDriver.id ? savedDriver : d);
      setDrivers(updatedDrivers);
    } else {
      // Add new driver
      if (drivers.some(d => d.id === savedDriver.id)) {
        // In a real app, you'd want better error handling here
        alert("En fører med denne ID-en finnes allerede.");
        return;
      }
      setDrivers([...drivers, savedDriver]);
    }
    setIsFormOpen(false);
    setDriverToEdit(null);
  };

  return (
    <div className="flex flex-col gap-4">
        <div className="flex justify-end">
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
