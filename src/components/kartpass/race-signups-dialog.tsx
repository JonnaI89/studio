"use client";

import { useState, useEffect } from "react";
import type { RaceSignup } from "@/lib/types";
import { getRaceSignups, deleteRaceSignup } from "@/services/race-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderCircle, User, Trash2 } from "lucide-react";

interface RaceSignupsDialogProps {
  raceId: string;
}

export function RaceSignupsDialog({ raceId }: RaceSignupsDialogProps) {
  const [signups, setSignups] = useState<RaceSignup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [signupToDelete, setSignupToDelete] = useState<RaceSignup | null>(null);

  useEffect(() => {
    const fetchSignups = async () => {
      if (!raceId) return;
      setIsLoading(true);
      try {
        const fetchedSignups = await getRaceSignups(raceId);
        setSignups(fetchedSignups);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Feil ved henting av påmeldinger",
          description: (error as Error).message || "En ukjent feil oppsto.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSignups();
  }, [raceId, toast]);

  const handleConfirmDelete = async () => {
    if (!signupToDelete) return;
    try {
      await deleteRaceSignup(signupToDelete.id);
      setSignups(prev => prev.filter(s => s.id !== signupToDelete.id));
      toast({ title: "Påmelding fjernet", description: `Påmeldingen for ${signupToDelete.driverName} er fjernet.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Fjerning feilet", description: (error as Error).message });
    } finally {
      setSignupToDelete(null);
    }
  };

  const groupedByKlasse = signups.reduce((acc, signup) => {
    const klasse = signup.driverKlasse || "Ukjent Klasse";
    if (!acc[klasse]) acc[klasse] = [];
    acc[klasse].push(signup);
    return acc;
  }, {} as Record<string, RaceSignup[]>);

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
        <p className="text-sm text-muted-foreground">Totalt {totalSignups} påmeldte.</p>
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
                            {signup.driverName}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setSignupToDelete(signup)}
                            title={`Fjern påmelding for ${signup.driverName}`}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </li>
                    ))}
                    </ul>
                </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </ScrollArea>
        <AlertDialog open={!!signupToDelete} onOpenChange={(isOpen) => !isOpen && setSignupToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Fjerne påmelding?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Er du sikker på at du vil fjerne påmeldingen for <span className="font-bold">{signupToDelete?.driverName}</span>?
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
    </div>
  );
}
