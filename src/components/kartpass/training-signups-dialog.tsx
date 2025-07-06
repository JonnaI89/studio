"use client";

import { useState, useEffect } from "react";
import type { TrainingSignup } from "@/lib/types";
import { getSignupsByDate } from "@/services/training-service";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { LoaderCircle, User } from "lucide-react";

export function TrainingSignupsDialog() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [signups, setSignups] = useState<TrainingSignup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSignups = async () => {
      if (!selectedDate) {
        setSignups([]);
        return;
      };
      setIsLoading(true);
      try {
        const dateString = format(selectedDate, "yyyy-MM-dd");
        const fetchedSignups = await getSignupsByDate(dateString);
        setSignups(fetchedSignups);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Feil ved henting av påmeldinger",
          description: "Kunne ikke hente påmeldinger. Det kan hende du må opprette et Firestore-indeks. Sjekk konsollen for en link.",
        });
        setSignups([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignups();
  }, [selectedDate, toast]);

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
                      <ul className="space-y-2 pt-2">
                        {drivers.map((signup) => (
                          <li key={signup.id} className="flex items-center gap-3 ml-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {signup.driverName}
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
    </div>
  );
}
