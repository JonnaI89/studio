"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, UserPlus, Trash2, PlusCircle } from "lucide-react";
import { cn, calculateAge } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Separator } from "../ui/separator";

const formSchema = z.object({
    id: z.string().optional(), // Firebase Auth UID, set after creation
    rfid: z.string().min(1, { message: "RFID/ID er påkrevd." }),
    email: z.string().email({ message: "Gyldig e-post er påkrevd." }).optional().or(z.literal('')),
    name: z.string().min(2, { message: "Navn må ha minst 2 tegn." }),
    dob: z.date({ required_error: "Fødselsdato er påkrevd." }),
    club: z.string().min(2, { message: "Klubb må ha minst 2 tegn." }),
    role: z.enum(['driver', 'admin']),
    klasse: z.string().optional(),
    startNr: z.string().optional(),
    driverLicense: z.string().optional(),
    vehicleLicense: z.string().optional(),
    teamLicense: z.string().optional(),
    guardianName: z.string().optional(),
    guardianContact: z.string().optional(),
    guardianLicenses: z.array(z.object({ value: z.string() })).optional(),
}).refine(data => {
    if (!data.dob) return true;
    const age = calculateAge(format(data.dob, "yyyy-MM-dd"));
    if (age !== null && age < 18 && !data.teamLicense) {
        return !!data.guardianName && data.guardianName.length > 1 && !!data.guardianContact && data.guardianContact.length > 1;
    }
    return true;
}, {
    message: "Navn og kontakt for foresatt er påkrevd for førere under 18 (med mindre teamlisens er angitt).",
    path: ["guardianName"],
});

type FormValues = z.infer<typeof formSchema>;

interface DriverFormProps {
    driverToEdit?: Driver | null;
    onSave: (data: Omit<Driver, 'id'>, id?: string) => void;
    closeDialog: () => void;
    rfidFromScan?: string;
    isRestrictedView?: boolean;
}

export function DriverForm({ driverToEdit, onSave, closeDialog, rfidFromScan, isRestrictedView = false }: DriverFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: driverToEdit ? {
            ...driverToEdit,
            dob: new Date(driverToEdit.dob),
            email: driverToEdit.email || "",
            rfid: driverToEdit.rfid || "",
            klasse: driverToEdit.klasse || "",
            startNr: driverToEdit.startNr || "",
            driverLicense: driverToEdit.driverLicense || "",
            vehicleLicense: driverToEdit.vehicleLicense || "",
            teamLicense: driverToEdit.teamLicense || "",
            guardianName: driverToEdit.guardian?.name || "",
            guardianContact: driverToEdit.guardian?.contact || "",
            guardianLicenses: driverToEdit.guardian?.licenses?.map(l => ({ value: l })) || [],
        } : {
            rfid: rfidFromScan || "",
            name: "",
            email: "",
            club: "",
            role: "driver",
            klasse: "",
            startNr: "",
            driverLicense: "",
            vehicleLicense: "",
            teamLicense: "",
            guardianName: "",
            guardianContact: "",
            guardianLicenses: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "guardianLicenses",
    });

    const dob = form.watch("dob");
    const teamLicense = form.watch("teamLicense");
    const [isUnderage, setIsUnderage] = useState(false);
    
    useEffect(() => {
        if (dob) {
            const age = calculateAge(format(dob, "yyyy-MM-dd"));
            setIsUnderage(age !== null && age < 18);
        }
    }, [dob]);
    
    const handleDobChange = (date: Date | undefined) => {
        if (date) {
            form.setValue("dob", date, { shouldValidate: true });
        }
    };

    function onSubmit(values: FormValues) {
        const driverData: Omit<Driver, 'id'> = {
            rfid: values.rfid,
            email: values.email || '',
            name: values.name,
            dob: format(values.dob, "yyyy-MM-dd"),
            club: values.club,
            role: values.role,
            klasse: values.klasse,
            startNr: values.startNr,
            driverLicense: values.driverLicense,
            vehicleLicense: values.vehicleLicense,
            teamLicense: values.teamLicense,
        };

        if (isUnderage && !values.teamLicense) {
            driverData.guardian = {
                name: values.guardianName || '',
                contact: values.guardianContact || '',
                licenses: values.guardianLicenses?.map(l => l.value).filter(Boolean),
            };
        }
        
        onSave(driverData, values.id);
        closeDialog();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!isRestrictedView && (
                            <FormField
                                control={form.control}
                                name="rfid"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>RFID / Fører-ID</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Skann eller skriv inn ID"
                                                {...field}
                                                value={field.value ?? ''}
                                                readOnly={!!driverToEdit?.rfid}
                                                className={cn(!!driverToEdit?.rfid && "cursor-not-allowed opacity-70")}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Denne ID-en brukes for innsjekk.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fullt Navn</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ola Nordmann" {...field} value={field.value ?? ''} autoFocus />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-post (for innlogging)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="ola@nordmann.no"
                                            {...field}
                                            value={field.value ?? ''}
                                            readOnly={!!driverToEdit?.email}
                                            className={cn(!!driverToEdit?.email && "cursor-not-allowed opacity-70")}
                                        />
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
                                <FormDescription>
                                    Passord settes til DDMMÅÅÅÅ ved nyregistrering.
                                </FormDescription>
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
                                        <Input placeholder="Oslo Karting Klubb" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!isRestrictedView && (
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Rolle</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Velg en rolle" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="driver">Fører</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
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
                    <Separator />
                    <FormField
                        control={form.control}
                        name="teamLicense"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Anmelder / Team-lisens</FormLabel>
                                <FormControl>
                                    <Input placeholder="Lisensnummer for team" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormDescription>
                                    Hvis denne er fylt ut, overstyrer den informasjon om foresatte.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    {isUnderage && (
                         <div className={cn("transition-opacity", !!teamLicense && "opacity-50 pointer-events-none")}>
                            <Separator className="my-6" />
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                <h3 className="font-semibold text-amber-600">Fører er under 18 år</h3>
                                <p className="text-sm text-muted-foreground">
                                    Informasjon om foresatt er påkrevd, med mindre team-lisens er angitt.
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
                                </div>
                                <div className="space-y-2 pt-2">
                                    <FormLabel>Foresattes Lisenser</FormLabel>
                                    {fields.map((field, index) => (
                                        <FormField
                                            key={field.id}
                                            control={form.control}
                                            name={`guardianLicenses.${index}.value`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl>
                                                            <Input placeholder={`Lisensnummer ${index + 1}`} {...field} value={field.value ?? ''} />
                                                        </FormControl>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => append({ value: "" })}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Legg til lisens
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    {form.formState.errors.guardianName && (
                        <FormMessage>{form.formState.errors.guardianName.message}</FormMessage>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button type="submit">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {driverToEdit ? 'Lagre Endringer' : 'Registrer Fører'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
