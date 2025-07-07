"use client";

import { useState } from "react";
import type { Race } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoaderCircle, PlusCircle, Trash2 } from "lucide-react";
import { createRace, updateRace, deleteRace } from "@/services/race-service";
import { RacesTable } from "./races-table";
import { RaceForm } from "./race-form";
import { RaceSignupsDialog } from "./race-signups-dialog";

interface RaceManagementPageProps {
  initialRaces: Race[];
}

export function RaceManagementPage({ initialRaces }: RaceManagementPageProps) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSignupsOpen, setIsSignupsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceToDelete, setRaceToDelete] = useState<Race | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddNew = () => {
    setSelectedRace(null);
    setIsFormOpen(true);
  };

  const handleEdit = (race: Race) => {
    setSelectedRace(race);
    setIsFormOpen(true);
  };

  const handleViewSignups = (race: Race) => {
    setSelectedRace(race);
    setIsSignupsOpen(true);
  };

  const handleDelete = (race: Race) => {
    setRaceToDelete(race);
    setIsDeleteAlertOpen(true);
  };
  
  const refreshRaces = async () => {
    // In a real app, you'd fetch this from the service again.
    // For now, we manually update the state in handleSave and handleConfirmDelete.
  }

  const handleSave = async (raceData: Omit<Race, 'id' | 'createdAt' | 'status'>, id?: string) => {
    setIsLoading(true);
    try {
      if (id && selectedRace) {
        const raceToUpdate: Race = { ...selectedRace, ...raceData };
        await updateRace(raceToUpdate);
        setRaces(races.map(r => r.id === id ? raceToUpdate : r));
        toast({ title: "Løp oppdatert", description: `${raceData.name} er lagret.` });
      } else {
        const newRace = await createRace(raceData);
        setRaces([newRace, ...races]);
        toast({ title: "Løp opprettet", description: `${raceData.name} er lagt til.` });
      }
      setIsFormOpen(false);
      setSelectedRace(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Lagring feilet", description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!raceToDelete) return;
    setIsLoading(true);
    try {
        await deleteRace(raceToDelete.id);
        setRaces(races.filter(r => r.id !== raceToDelete.id));
        toast({ title: "Løp slettet", description: `${raceToDelete.name} er fjernet.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Sletting feilet", description: (error as Error).message });
    } finally {
        setIsLoading(false);
        setIsDeleteAlertOpen(false);
        setRaceToDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Opprett nytt løp
        </Button>
      </div>
      <RacesTable 
        races={races} 
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewSignups={handleViewSignups}
      />
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRace ? 'Rediger Løp' : 'Opprett Løp'}</DialogTitle>
            <DialogDescription>
              Fyll ut detaljene for løpet under.
            </DialogDescription>
          </DialogHeader>
          <RaceForm 
            raceToEdit={selectedRace}
            onSave={handleSave}
            closeDialog={() => setIsFormOpen(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSignupsOpen} onOpenChange={setIsSignupsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Påmeldte til {selectedRace?.name}</DialogTitle>
            <DialogDescription>
              Liste over førere som er påmeldt dette løpet.
            </DialogDescription>
          </DialogHeader>
          {selectedRace && <RaceSignupsDialog raceId={selectedRace.id} />}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette løpet <span className="font-bold">{raceToDelete?.name}</span> og alle tilknyttede påmeldinger. Handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={isLoading} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Ja, slett løpet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
