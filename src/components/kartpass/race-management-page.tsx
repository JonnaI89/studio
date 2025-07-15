
"use client";

import { useState, useEffect } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from "@/lib/firebase-config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export function RaceManagementPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'form'>('table');
  const [isSignupsOpen, setIsSignupsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceToDelete, setRaceToDelete] = useState<Race | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const racesQuery = query(collection(db, "races"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(racesQuery, (snapshot) => {
        const fetchedRaces = snapshot.docs.map(doc => doc.data() as Race);
        setRaces(fetchedRaces);
        setIsLoading(false);
    }, (error) => {
        console.error("Error listening to races:", error);
        toast({ variant: "destructive", title: "Feil ved henting av løp", description: "Kunne ikke lytte til sanntidsoppdateringer." });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleAddNew = () => {
    setSelectedRace(null);
    setViewMode('form');
  };

  const handleEdit = (race: Race) => {
    setSelectedRace(race);
    setViewMode('form');
  };

  const handleBackToList = () => {
      setViewMode('table');
      setSelectedRace(null);
  }

  const handleViewSignups = (race: Race) => {
    setSelectedRace(race);
    setIsSignupsOpen(true);
  };

  const handleDelete = (race: Race) => {
    setRaceToDelete(race);
    setIsDeleteAlertOpen(true);
  };
  
  const handleSave = async (raceData: Omit<Race, 'id' | 'createdAt' | 'status'>, id?: string) => {
    setIsLoading(true);
    try {
      if (id && selectedRace) {
        const raceToUpdate: Race = { ...selectedRace, ...raceData };
        await updateRace(raceToUpdate);
        toast({ title: "Løp oppdatert", description: `${raceData.name} er lagret.` });
      } else {
        await createRace(raceData);
        toast({ title: "Løp opprettet", description: `${raceData.name} er lagt til.` });
      }
      // Listener will update the state automatically
      handleBackToList();
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'table' ? 'Løpsadministrasjon' : (selectedRace ? 'Rediger Løp' : 'Opprett Løp')}
          </CardTitle>
          <CardDescription>
            {viewMode === 'table' 
                ? 'Her kan du opprette og administrere løp. Førere kan se og melde seg på kommende løp fra sin profilside.'
                : `Fyll ut detaljene for løpet under. Trykk lagre når du er ferdig.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
            {viewMode === 'table' ? (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Opprett nytt løp
                        </Button>
                    </div>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <LoaderCircle className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <RacesTable 
                            races={races} 
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onViewSignups={handleViewSignups}
                        />
                    )}
                </div>
            ) : (
                <RaceForm 
                    raceToEdit={selectedRace}
                    onSave={handleSave}
                    closeDialog={handleBackToList}
                    isLoading={isLoading}
                />
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isSignupsOpen} onOpenChange={setIsSignupsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Påmeldte til {selectedRace?.name}</DialogTitle>
            <DialogDescription>
              Liste over førere som er påmeldt dette løpet.
            </DialogDescription>
          </DialogHeader>
          {selectedRace && <RaceSignupsDialog raceId={selectedRace.id} showAdminControls={true} />}
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
    </>
  );
}
