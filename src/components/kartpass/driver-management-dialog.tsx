
"use client";

import { useState } from "react";
import type { DriverProfile, Driver } from "@/lib/types";
import { addOrUpdateDriverInProfile, deleteDriverFromProfile } from "@/services/driver-service";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { signUp } from "@/services/auth-service";

interface DriverManagementDialogProps {
  profiles: DriverProfile[];
  onDatabaseUpdate: () => void;
}

export function DriverManagementDialog({ profiles, onDatabaseUpdate }: DriverManagementDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [profileForDriver, setProfileForDriver] = useState<DriverProfile | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const { toast } = useToast();

  const handleEdit = (driver: Driver, profile: DriverProfile) => {
    setDriverToEdit(driver);
    setProfileForDriver(profile);
    setAddMode('existing');
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (driver: Driver) => {
    setDriverToDelete(driver);
  };

  const handleAddNew = () => {
    setDriverToEdit(null);
    setProfileForDriver(null);
    setAddMode('new');
    setIsFormOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriverFromProfile(driverToDelete.id);
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

  const handleSave = async (driverData: Omit<Driver, 'id' | 'authUid'>) => {
    setIsSaving(true);
    try {
      if (driverToEdit && profileForDriver) {
        // This is an update to an existing driver.
        await addOrUpdateDriverInProfile(profileForDriver.id, { ...driverData, id: driverToEdit.id, authUid: profileForDriver.id });
         toast({
            title: `Fører oppdatert`,
            description: `${driverData.name} er lagret i databasen.`,
        });
      } else {
        // This is a new driver or adding a driver to an existing family
        if (!driverData.email) {
            toast({ variant: "destructive", title: "E-post er påkrevd", description: "E-post må fylles ut." });
            setIsSaving(false);
            return;
        }

        const allDrivers = profiles.flatMap(p => p.drivers || []);
        if (allDrivers.some(d => d.rfid === driverData.rfid && d.rfid)) {
            toast({ variant: "destructive", title: "RFID Finnes Allerede", description: "En fører med denne RFID-brikken finnes allerede." });
            setIsSaving(false);
            return;
        }
        
        const existingProfile = profiles.find(p => p.email === driverData.email);

        if (existingProfile) {
            // Add a new driver (sibling) to an existing profile.
             await addOrUpdateDriverInProfile(existingProfile.id, driverData);
             toast({ title: 'Fører Lagt Til!', description: `Ny fører lagt til profilen for ${driverData.email}.` });
        } else {
            // Create a new user and a new driver profile for them.
            const user = await signUp(driverData.email, driverData.email);
            await addOrUpdateDriverInProfile(user.uid, driverData);
            toast({ title: 'Førerprofil Opprettet!', description: `Profil for ${driverData.name} er opprettet. Passord er det samme som e-post.` });
        }
      }

      onDatabaseUpdate();
      setIsFormOpen(false);
      setDriverToEdit(null);
      setProfileForDriver(null);

    } catch (error) {
      const errorMessage = (error as Error).message;
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes("auth/email-already-in-use")) {
        userFriendlyMessage = "E-posten er i bruk, men ikke i dette systemet. Bruk en annen e-post."
      }

      toast({
        variant: 'destructive',
        title: 'Lagring feilet',
        description: userFriendlyMessage || 'En ukjent feil oppsto.',
      });
    } finally {
        setIsSaving(false);
    }
  };
  
  const allDrivers = profiles.flatMap(p => p.drivers ? p.drivers.map(d => ({ ...d, profileId: p.id, profileEmail: p.email })) : []);

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
                        {driverToEdit ? 'Oppdater informasjonen for føreren.' : 'Fyll ut detaljene. Hvis e-posten finnes, legges føreren til den familien.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <DriverForm
                      driverToEdit={driverToEdit}
                      onSave={handleSave}
                      closeDialog={() => setIsFormOpen(false)}
                      isRestrictedView={false}
                      addMode={addMode}
                  />
                </ScrollArea>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!driverToDelete} onOpenChange={(isOpen) => !isOpen && setDriverToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Dette vil permanent slette profilen for <span className="font-bold">{driverToDelete?.name}</span> fra databasen. Hvis dette er den siste føreren på en konto, slettes hele familieprofilen. Selve innloggingskontoen blir ikke fjernet. Handlingen kan ikke angres.
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
