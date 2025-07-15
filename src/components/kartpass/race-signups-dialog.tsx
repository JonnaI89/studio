
"use client";

import { useState, useEffect } from "react";
import type { RaceSignup, Race } from "@/lib/types";
import { getRaceSignupsWithDriverData, deleteRaceSignup, getRaceById } from "@/services/race-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderCircle, User, Trash2, Download, LogIn, Tent } from "lucide-react";
import type { RaceSignupWithDriver } from "@/services/race-service";
import { RaceCheckinDialog } from "./race-checkin-dialog";


interface RaceSignupsDialogProps {
  raceId: string;
  showAdminControls?: boolean;
}

export function RaceSignupsDialog({ raceId, showAdminControls = false }: RaceSignupsDialogProps) {
  const [signups, setSignups] = useState<RaceSignupWithDriver[]>([]);
  const [race, setRace] = useState<Race | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [signupToInteract, setSignupToInteract] = useState<{ type: 'delete' | 'checkin', data: RaceSignupWithDriver } | null>(null);

  useEffect(() => {
    const fetchSignups = async () => {
      if (!raceId) return;
      setIsLoading(true);
      try {
        const [fetchedSignups, fetchedRace] = await Promise.all([
          getRaceSignupsWithDriverData(raceId),
          getRaceById(raceId),
        ]);
        setSignups(fetchedSignups);
        setRace(fetchedRace);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Feil ved henting av data",
          description: (error as Error).message || "En ukjent feil oppsto.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSignups();
  }, [raceId, toast]);

  const handleConfirmDelete = async () => {
    if (!signupToInteract || signupToInteract.type !== 'delete') return;
    const { data: signupToDelete } = signupToInteract;

    try {
      await deleteRaceSignup(signupToDelete.id);
      setSignups(prev => prev.filter(s => s.id !== signupToDelete.id));
      toast({ title: "Påmelding fjernet", description: `Påmeldingen for ${signupToDelete.driverName} er fjernet.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Fjerning feilet", description: (error as Error).message });
    } finally {
      setSignupToInteract(null);
    }
  };

  const handleExport = () => {
    if (signups.length === 0) {
        toast({ title: "Ingen data å eksportere" });
        return;
    }

    const headers = ["Klasse", "Navn", "StartNr", "TransponderNr", "Klubb", "Camping"];
    const csvContent = [
        headers.join(","),
        ...signups.map(signup => [
            `"${signup.driverKlasse || ''}"`,
            `"${signup.driverName}"`,
            `"${signup.driver?.startNr || ''}"`,
            `"${signup.driver?.transponderNr || ''}"`,
            `"${signup.driver?.club || ''}"`,
            `"${signup.wantsCamping ? 'Ja' : 'Nei'}"`,
        ].join(","))
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `tidtaker-liste-${raceId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const groupedByKlasse = signups.reduce((acc, signup) => {
    const klasse = signup.driverKlasse || "Ukjent Klasse";
    if (!acc[klasse]) acc[klasse] = [];
    acc[klasse].push(signup);
    return acc;
  }, {} as Record<string, RaceSignupWithDriver[]>);

  const totalSignups = signups.length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (totalSignups === 0) {
      return (
          <div className="text-center py-8">
              <p className="font-semibold">Ingen påmeldte</p>
              <p className="text-sm text-muted-foreground">Ingen førere har meldt seg på dette løpet enda.</p>
          </div>
      )
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Totalt {totalSignups} påmeldte.</p>
            {showAdminControls && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Eksporter til CSV
                </Button>
            )}
        </div>
        <ScrollArea className="h-[50vh] pr-4">
            <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedByKlasse)}>
            {Object.entries(groupedByKlasse).map(([klasse, drivers]) => (
                <AccordionItem value={klasse} key={klasse}>
                <AccordionTrigger>
                    <div className="flex justify-between w-full pr-2">
                    <span className="font-semibold">{klasse}</span>
                    <span className="text-muted-foreground">{drivers.length} påmeldte</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <ul className="space-y-1 pt-2">
                    {drivers.map((signup) => (
                        <li key={signup.id} className="flex items-center justify-between gap-3 ml-2 group hover:bg-muted/50 rounded-md p-1">
                          <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div className="flex items-center gap-2">
                                {signup.driverName}
                                {signup.wantsCamping && <Tent className="h-4 w-4 text-sky-600" title="Ønsker camping" />}
                              </div>
                          </div>
                          {showAdminControls && (
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7"
                                  onClick={() => setSignupToInteract({ type: 'checkin', data: signup })}
                                  title={`Sjekk inn ${signup.driverName}`}
                                >
                                  <LogIn className="mr-2 h-4 w-4 text-green-600" />
                                  Ankomst
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setSignupToInteract({ type: 'delete', data: signup })}
                                    title={`Fjern påmelding for ${signup.driverName}`}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                          )}
                        </li>
                    ))}
                    </ul>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </ScrollArea>
        {showAdminControls && (
            <>
              <AlertDialog 
                open={signupToInteract?.type === 'delete'} 
                onOpenChange={(isOpen) => !isOpen && setSignupToInteract(null)}
              >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Fjerne påmelding?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Er du sikker på at du vil fjerne påmeldingen for <span className="font-bold">{signupToInteract?.data.driverName}</span>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ja, fjern påmelding
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <RaceCheckinDialog
                isOpen={signupToInteract?.type === 'checkin'}
                onOpenChange={(isOpen) => !isOpen && setSignupToInteract(null)}
                signup={signupToInteract?.type === 'checkin' ? signupToInteract.data : undefined}
                race={race}
                onCheckinSuccess={() => setSignupToInteract(null)}
              />
            </>
        )}
    </div>
  );
}
