"use client";

import { useState, useEffect } from "react";
import type { TrainingSignup, CheckedInEntry } from "@/lib/types";
import { getSignupsByDate, deleteTrainingSignup } from "@/services/training-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { LoaderCircle, User, CheckCircle2, Trash2 } from "lucide-react";

interface TrainingSignupsDialogProps {
  checkedInEntries: CheckedInEntry[];
}

export function TrainingSignupsDialog({ checkedInEntries }: TrainingSignupsDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [signups, setSignups] = useState<TrainingSignup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [signupToDelete, setSignupToDelete] = useState<TrainingSignup | null>(null);

  useEffect(() => {
    const fetchSignups = async () => {
      if (!selectedDate) {
        setSignups([]);
        return;
      }
      setIsLoading(true);
      try {
        const dateString = format(selectedDate, "yyyy-MM-dd");
        const fetchedSignups = await getSignupsByDate(dateString);
        setSignups(fetchedSignups);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Feil ved henting av påmeldinger",
          description: (error as Error).message || "En ukjent feil oppsto.",
        });
        setSignups([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignups();
  }, [selectedDate, toast]);
  
  const checkedInDriverIds = new Set(checkedInEntries.map(entry => entry.driver.id));

  const handleConfirmDelete = async () => {
    if (!signupToDelete) return;
    try {
      await deleteTrainingSignup(signupToDelete.id);
      setSignups(prev => prev.filter(s => s.id !== signupToDelete.id));
      toast({
        title: "Påmelding Fjernet",
        description: `Påmeldingen for ${signupToDelete.driverName} er fjernet.`,
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Fjerning Feilet",
        description: (error as Error).message,
      });
    } finally {
      setSignupToDelete(null);
    }
  };

  const groupedByKlasse = signups.reduce((acc, signup) => {
    const klasse = signup.driverKlasse || "Ukjent Klasse";
    if (!acc[klasse]) {
      acc[klasse] = [];
    }
    acc[klasse].push(signup);
    return acc;
  }, {} as Record<string, TrainingSignup[]>);

  const totalSignups = signups.length;

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            Påmeldte {selectedDate ? format(selectedDate, "dd.MM.yyyy") : ""}
          </CardTitle>
          <CardDescription>
            Totalt {totalSignups} påmeldte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totalSignups > 0 ? (
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
                              {checkedInDriverIds.has(signup.driverId) ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" title="Innsjekket" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
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
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center">
              <p className="font-semibold">Ingen påmeldinger</p>
              <p className="text-sm">Ingen førere er påmeldt for den valgte datoen.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!signupToDelete} onOpenChange={(isOpen) => !isOpen && setSignupToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Fjerne påmelding?</AlertDialogTitle>
                <AlertDialogDescription>
                    Er du sikker på at du vil fjerne påmeldingen for <span className="font-bold">{signupToDelete?.driverName}</span>? Dette vil fjerne dem fra listen for denne dagen, men de kan melde seg på igjen. Handlingen kan ikke angres.
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
