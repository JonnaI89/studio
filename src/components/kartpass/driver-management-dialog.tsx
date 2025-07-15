
"use client";

import { useState } from "react";
import type { Driver, DriverProfile } from "@/lib/types";
import { addSiblingToProfile, updateFirebaseDriverProfile, deleteFirebaseDriverProfile, addFirebaseDriverProfile } from "@/services/firebase-service";
import { signUp } from "@/services/auth-service";
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
import { v4 as uuidv4 } from 'uuid';

interface DriverManagementDialogProps {
  profiles: DriverProfile[];
  onDatabaseUpdate: () => void;
}

export function DriverManagementDialog({ profiles, onDatabaseUpdate }: DriverManagementDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<DriverProfile | null>(null);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<DriverProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleEdit = (driver: Driver, profile: DriverProfile) => {
    setProfileToEdit(profile);
    setDriverToEdit(driver);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteDialog = (profile: DriverProfile) => {
    setProfileToDelete(profile);
  };

  const handleAddNew = () => {
    setProfileToEdit(null);
    setDriverToEdit(null);
    setIsFormOpen(true);
  };

  const handleAddSibling = (profile: DriverProfile) => {
    setProfileToEdit(profile);
    setDriverToEdit(null); // Clear driver form for new sibling
    setIsFormOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFirebaseDriverProfile(profileToDelete.id);
      toast({
        title: "Profil Slettet",
        description: `Profil for ${profileToDelete.email} har blitt fjernet.`,
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
      setProfileToDelete(null);
    }
  };

  const handleSave = async (driverData: Omit<Driver, 'id'>, profileId?: string) => {
    setIsSaving(true);
    try {
      if (profileToEdit && driverToEdit) {
        // Updating an existing driver within an existing profile
        const updatedDrivers = profileToEdit.drivers.map(d => 
          d.id === driverToEdit.id ? { ...driverToEdit, ...driverData } : d
        );
        const updatedProfile = { ...profileToEdit, drivers: updatedDrivers };
        await updateFirebaseDriverProfile(updatedProfile);
        toast({
            title: `Fører oppdatert`,
            description: `${driverData.name} er lagret i databasen.`,
        });

      } else if (profileToEdit && !driverToEdit) {
        // Adding a new sibling to an existing profile
        await addSiblingToProfile(profileToEdit.id, driverData);
        toast({
          title: 'Søsken Lagt Til!',
          description: `Profil for ${driverData.name} er lagt til i familien.`,
        });

      } else {
        // This is a new profile with its first driver
        if (!profileId) { // The email is used as profileId for new profiles
            toast({
                variant: "destructive",
                title: "E-post er påkrevd",
                description: "E-post må fylles ut for å opprette en ny profil.",
            });
            setIsSaving(false);
            return;
        }

        const allDrivers = profiles.flatMap(p => p.drivers || []);
        if (allDrivers.some(d => d.rfid === driverData.rfid && d.rfid)) {
          toast({
            variant: "destructive",
            title: "RFID Finnes Allerede",
            description: "En fører med denne RFID-brikken finnes allerede.",
          });
          setIsSaving(false);
          return;
        }

        const user = await signUp(profileId, profileId); // password is same as email
        await addFirebaseDriverProfile({ email: profileId }, driverData, user.uid);
        
        toast({
            title: 'Profil Opprettet!',
            description: `Profil for ${driverData.name} er opprettet. Passord er det samme som e-post.`,
        });
      }

      onDatabaseUpdate();
      setIsFormOpen(false);
      setProfileToEdit(null);
      setDriverToEdit(null);

    } catch (error) {
      const errorMessage = (error as Error).message;
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes("auth/email-already-in-use")) {
        userFriendlyMessage = "En profil med denne e-postadressen finnes allerede."
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

  const allDriversFlat = profiles.flatMap(p => 
    p.drivers ? p.drivers.map(d => ({ ...d, profileId: p.id, profileEmail: p.email })) : []
  );

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
                    Registrer ny familie
                </Button>
            </div>
        </div>
        <div className="flex-1 min-h-0">
          <DriversTable 
            profiles={profiles} 
            onEdit={handleEdit} 
            onDelete={handleOpenDeleteDialog}
            onAddSibling={handleAddSibling}
          />
        </div>

        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) {
                setProfileToEdit(null);
                setDriverToEdit(null);
            }
        }}>
            <DialogContent className="max-w-xl">
                 <DialogHeader className="flex flex-row justify-between items-start">
                    <div>
                      <DialogTitle>{driverToEdit ? 'Rediger Fører' : 'Registrer Ny Fører'}</DialogTitle>
                      <DialogDescription>
                          {driverToEdit ? `Redigerer ${driverToEdit.name}.` : (profileToEdit ? `Legger til søsken i familien til ${profileToEdit.email}`: 'Fyll ut detaljene for den nye føreren og profilen.')}
                      </DialogDescription>
                    </div>
                     {driverToEdit && <Button variant="outline" onClick={() => handleAddSibling(profileToEdit!)}>Legg til søsken</Button>}
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <DriverForm
                      driverToEdit={driverToEdit}
                      profileToEdit={profileToEdit}
                      onSave={handleSave}
                      isSaving={isSaving}
                      isRestrictedView={false}
                  />
                </ScrollArea>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!profileToDelete} onOpenChange={(isOpen) => !isOpen && setProfileToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Dette vil permanent slette profilen for <span className="font-bold">{profileToDelete?.email}</span> og alle tilhørende førere. Handlingen kan ikke angres.
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
                        Ja, slett profilen
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
