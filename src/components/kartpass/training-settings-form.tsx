"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { TrainingSettings } from "@/lib/types";
import { updateTrainingSettings } from "@/services/training-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, PlusCircle, Save } from "lucide-react";
import { Separator } from "../ui/separator";

const trainingRuleSchema = z.object({
  id: z.string(),
  month: z.coerce.number().min(0).max(11),
  daysOfWeek: z.array(z.coerce.number()).min(1, "Du må velge minst én dag."),
  description: z.string().optional(),
});

const formSchema = z.object({
  year: z.coerce.number().min(new Date().getFullYear()),
  rules: z.array(trainingRuleSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface TrainingSettingsFormProps {
  initialSettings: TrainingSettings;
}

const months = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni", 
  "Juli", "August", "September", "Oktober", "November", "Desember"
];
const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

export function TrainingSettingsForm({ initialSettings }: TrainingSettingsFormProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: initialSettings.year,
      rules: initialSettings.rules || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rules",
  });
  
  const onSubmit = async (data: FormValues) => {
    try {
      const settingsToSave: TrainingSettings = {
        id: 'main',
        year: data.year,
        rules: data.rules.map(rule => ({
          ...rule,
          description: `${months[rule.month]}: ${rule.daysOfWeek.map(d => days[d].slice(0, 3)).join(', ')}`
        }))
      };
      await updateTrainingSettings(settingsToSave);
      toast({
        title: "Innstillinger Lagret",
        description: "Treningsdagene er oppdatert.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lagring feilet",
        description: (error as Error).message,
      });
    }
  };

  const addRule = () => {
    const usedMonths = fields.map(field => field.month);
    const nextMonth = months.findIndex((_, i) => !usedMonths.includes(i));
    append({
      id: crypto.randomUUID(),
      month: nextMonth !== -1 ? nextMonth : 0,
      daysOfWeek: [],
    });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sesongår</FormLabel>
              <Input type="number" {...field} className="w-32" />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">
                    {months[form.watch(`rules.${index}.month`)] || `Regel #${index + 1}`}
                </CardTitle>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name={`rules.${index}.month`}
                  render={({ field: monthField }) => (
                    <FormItem>
                      <FormLabel>Måned</FormLabel>
                      <Select onValueChange={monthField.onChange} defaultValue={String(monthField.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg måned..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {months.map((month, i) => (
                            <SelectItem key={month} value={String(i)}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`rules.${index}.daysOfWeek`}
                  render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel>Dager</FormLabel>
                            <p className="text-sm text-muted-foreground">Velg hvilke dager det er trening for den valgte måneden.</p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
                          {days.map((day, dayIndex) => (
                            <FormField
                              key={dayIndex}
                              control={form.control}
                              name={`rules.${index}.daysOfWeek`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(dayIndex)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), dayIndex])
                                          : field.onChange(field.value?.filter((value) => value !== dayIndex));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{day}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage className="pt-2"/>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Button type="button" variant="outline" onClick={addRule}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Legg til ny månedsregel
        </Button>

        <Separator />
        
        <div className="flex justify-end">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Lagre Innstillinger
            </Button>
        </div>
      </form>
    </Form>
  );
}
