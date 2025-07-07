"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Race } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, LoaderCircle, Save } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, { message: "Navn må være minst 3 tegn." }),
  date: z.date({ required_error: "Dato er påkrevd." }),
  description: z.string().min(10, { message: "Beskrivelse må være minst 10 tegn." }),
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
      description: raceToEdit.description,
    } : {
      name: "",
      description: "",
    },
  });

  function onSubmit(values: FormValues) {
    const raceData = {
      ...values,
      date: format(values.date, "yyyy-MM-dd"),
    };
    onSave(raceData, raceToEdit?.id);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
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
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Dato</FormLabel>
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
