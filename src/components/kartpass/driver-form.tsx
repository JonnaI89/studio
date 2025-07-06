"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Driver } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Separator } from "../ui/separator";

function calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

const formSchema = z.object({
    id: z.string().min(1, { message: "RFID/ID er påkrevd." }),
    name: z.string().min(2, { message: "Navn må ha minst 2 tegn." }),
    dob: z.date({ required_error: "Fødselsdato er påkrevd." }),
    club: z.string().min(2, { message: "Klubb må ha minst 2 tegn." }),
    klasse: z.string().optional(),
    startNr: z.string().optional(),
    driverLicense: z.string().optional(),
    vehicleLicense: z.string().optional(),
    guardianName: z.string().optional(),
    guardianContact: z.string().optional(),
    guardianLicense: z.string().optional(),
}).refine(data => {
    if (!data.dob) return true;
    const age = calculateAge(data.dob);
    if (age < 18) {
        return !!data.guardianName && data.guardianName.length > 1 && !!data.guardianContact && data.guardianContact.length > 1;
    }
    return true;
}, {
    message: "Navn og kontakt for foresatt er påkrevd for førere under 18 år.",
    path: ["guardianName"],
});

interface DriverFormProps {
    driverToEdit?: Driver | null;
    onSave: (newDriver: Driver) => void;
    closeDialog: () => void;
}

export function DriverForm({ driverToEdit, onSave, closeDialog }: DriverFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: driverToEdit ? {
            ...driverToEdit,
            dob: new Date(driverToEdit.dob),
            klasse: driverToEdit.klasse || "",
            startNr: driverToEdit.startNr || "",
            driverLicense: driverToEdit.driverLicense || "",
            vehicleLicense: driverToEdit.vehicleLicense || "",
            guardianName: driverToEdit.guardian?.name || "",
            guardianContact: driverToEdit.guardian?.contact || "",
            guardianLicense: driverToEdit.guardian?.guardianLicense || "",
        } : {
            id: "",
            name: "",
            club: "",
            klasse: "",
            startNr: "",
            driverLicense: "",
            vehicleLicense: "",
            guardianName: "",
            guardianContact: "",
            guardianLicense: "",
        },
    });

    const dob = form.watch("dob");
    const [isUnderage, setIsUnderage] = useState(false);
    
    useEffect(() => {
        if (dob) {
            setIsUnderage(calculateAge(dob) < 18);
        }
    }, [dob]);
    
    const handleDobChange = (date: Date | undefined) => {
        if (date) {
            form.setValue("dob", date, { shouldValidate: true });
        }
    };

    function onSubmit(values: z.infer<typeof formSchema>) {
        const newDriver: Driver = {
            id: values.id,
            name: values.name,
            dob: format(values.dob, "yyyy-MM-dd"),
            club: values.club,
            klasse: values.klasse,
            startNr: values.startNr,
            driverLicense: values.driverLicense,
            vehicleLicense: values.vehicleLicense,
        };

        if (isUnderage) {
            newDriver.guardian = {
                name: values.guardianName || '',
                contact: values.guardianContact || '',
                guardianLicense: values.guardianLicense,
            };
        }
        
        onSave(newDriver);
        closeDialog();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>RFID / Fører-ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="Skann eller skriv inn ID" {...field} disabled={!!driverToEdit} />
                                </FormControl>
                                <FormDescription>
                                    Denne ID-en kan ikke endres.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fullt Navn</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ola Nordmann" {...field} autoFocus />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="dob"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Fødselsdato</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
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
                                    captionLayout="dropdown-buttons"
                                    fromYear={1920}
                                    toYear={new Date().getFullYear()}
                                    selected={field.value}
                                    onSelect={(date) => handleDobChange(date)}
                                    disabled={(date) =>
                                        date > new Date() || date < new Date("1920-01-01")
                                    }
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
                        name="club"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Klubb</FormLabel>
                                <FormControl>
                                    <Input placeholder="Oslo Karting Klubb" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="klasse"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Klasse</FormLabel>
                                <FormControl>
                                    <Input placeholder="F.eks. Rotax, KZ2" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startNr"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Startnummer</FormLabel>
                                <FormControl>
                                    <Input placeholder="F.eks. 42" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="driverLicense"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Førerlisens</FormLabel>
                                <FormControl>
                                    <Input placeholder="Lisensnummer for fører" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="vehicleLicense"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Vognlisens</FormLabel>
                                <FormControl>
                                    <Input placeholder="Lisensnummer for vogn" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                {isUnderage && (
                    <>
                        <Separator className="my-6" />
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                            <h3 className="font-semibold text-amber-600">Fører er under 18 år</h3>
                            <p className="text-sm text-muted-foreground">
                                Informasjon om foresatt er påkrevd.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="guardianName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Foresattes Navn</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Kari Nordmann" {...field} value={field.value ?? ''}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="guardianContact"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Foresattes Kontaktinfo</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+47 123 45 678" {...field} value={field.value ?? ''}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="guardianLicense"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Foresattes Lisens</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Lisensnummer for foresatt" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </>
                )}
                 {form.formState.errors.guardianName && (
                    <FormMessage>{form.formState.errors.guardianName.message}</FormMessage>
                )}

                <div className="flex justify-end pt-4">
                    <Button type="submit">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {driverToEdit ? 'Lagre Endringer' : 'Registrer Fører'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
