"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Navn må ha minst 2 tegn." }),
  licenseNumber: z.string().min(1, { message: "Lisensnummer er påkrevd." }),
});

interface OneTimeLicenseCheckinDialogProps {
  onCheckIn: (name: string, licenseNumber: string) => void;
  closeDialog: () => void;
}

export function OneTimeLicenseCheckinDialog({ onCheckIn, closeDialog }: OneTimeLicenseCheckinDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", licenseNumber: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onCheckIn(values.name, values.licenseNumber);
    closeDialog();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Registrer Engangslisens</DialogTitle>
        <DialogDescription>
          Sjekk inn en fører med engangslisens for dagens økt. Denne
          informasjonen lagres kun for denne økten og blir ikke en permanent
          profil.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Navn</FormLabel>
                <FormControl>
                  <Input placeholder="Ola Nordmann" {...field} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engangslisensnummer</FormLabel>
                <FormControl>
                  <Input placeholder="Lisensnummer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="pt-4">
            <DialogClose asChild>
                <Button type="button" variant="ghost">Avbryt</Button>
            </DialogClose>
            <Button type="submit">
              <Check className="mr-2 h-4 w-4" />
              Sjekk Inn Fører
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
