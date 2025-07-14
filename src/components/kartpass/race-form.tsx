"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Race } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { CalendarIcon, LoaderCircle, Save } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, { message: "Navn må være minst 3 tegn." }),
  date: z.date({ required_error: "Startdato er påkrevd." }),
  endDate: z.date().optional(),
  description: z.string().min(10, { message: "Beskrivelse må være minst 10 tegn." }),
  availableClasses: z.string().optional(),
  entryFee: z.coerce.number().positive().optional(),
}).refine(data => !data.endDate || data.endDate >= data.date, {
    message: "Sluttdato kan ikke være før startdato.",
    path: ["endDate"],
});


type FormValues = z.infer<typeof formSchema>;

interface RaceFormProps {
  raceToEdit?: Race | null;
  onSave: (data: Omit<Race, 'id' | 'createdAt' | 'status'>, id?: string) => void;
  closeDialog: () => void;
  isLoading: boolean;
}

export function RaceForm({ raceToEdit, onSave, closeDialog, isLoading }: RaceFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: raceToEdit ? {
      name: raceToEdit.name,
      date: new Date(raceToEdit.date),
      endDate: raceToEdit.endDate ? parseISO(raceToEdit.endDate) : undefined,
      description: raceToEdit.description,
      availableClasses: raceToEdit.availableClasses?.join('\n') || '',
      entryFee: raceToEdit.entryFee || undefined,
    } : {
      name: "",
      description: "",
      availableClasses: "",
      entryFee: undefined,
    },
  });

  function onSubmit(values: FormValues) {
    const raceData = {
      ...values,
      date: format(values.date, "yyyy-MM-dd"),
      endDate: values.endDate ? format(values.endDate, "yyyy-MM-dd") : undefined,
      availableClasses: values.availableClasses?.split('\n').map(s => s.trim()).filter(Boolean) || [],
    };
    onSave(raceData, raceToEdit?.id);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem className="md:col-span-2">
                <FormLabel>Navn på løp</FormLabel>
                <FormControl>
                    <Input placeholder="Klubbmesterskap Vår" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="entryFee"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Påmeldingsavgift (kr)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="350" {...field} value={field.value ?? ''} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Startdato</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                        >
                        {field.value ? (
                            format(field.value, "dd.MM.yyyy")
                        ) : (
                            <span>Velg en dato</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Sluttdato (Valgfri)</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                        >
                        {field.value ? (
                            format(field.value, "dd.MM.yyyy")
                        ) : (
                            <span>Velg en dato</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beskrivelse</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Skriv en kort beskrivelse av løpet, klasser, tidsskjema etc."
                  className="resize-y min-h-[100px]"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="availableClasses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tilgjengelige Klasser</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Én klasse per linje, f.eks.&#10;Rotax&#10;KZ2&#10;Cadetti"
                  className="resize-y min-h-[100px]"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Førere må velge én av disse klassene ved påmelding.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isLoading}>Avbryt</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {raceToEdit ? 'Lagre Endringer' : 'Opprett Løp'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
