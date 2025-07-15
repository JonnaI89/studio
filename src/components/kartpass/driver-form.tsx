
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
import { Switch } from "@/components/ui/switch";
import { Save, PlusCircle, Trash2 } from "lucide-react";
import { cn, parseDateString } from "@/lib/utils";
import { format } from "date-fns";
import { Separator } from "../ui/separator";

const dobSchema = z.string().refine(val => {
    if (!val) return true; // Allow empty string
    return parseDateString(val) !== null;
}, {
    message: "Ugyldig datoformat. Bruk DD.MM.YYYY.",
}).refine(val => {
    if (!val) return true; // Allow empty string
    const date = parseDateString(val);
    return date && date < new Date();
}, {
    message: "Dato kan ikke være i fremtiden."
});


const guardianSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Navn er påkrevd."),
  contact: z.string().min(1, "Kontaktinfo er påkrevd."),
  licenses: z.array(z.object({ value: z.string() })).optional(),
});

const formSchema = z.object({
    id: z.string().optional(),
    authUid: z.string().optional(),
    rfid: z.string().min(1, { message: "RFID/ID er påkrevd." }),
    email: z.string().email({ message: "Gyldig e-post er påkrevd." }).optional().or(z.literal('')),
    name: z.string().min(2, { message: "Navn må ha minst 2 tegn." }),
    dob: dobSchema.optional(),
    club: z.string().min(2, { message: "Klubb må ha minst 2 tegn." }),
    hasSeasonPass: z.boolean().optional(),
    klasse: z.string().optional(),
    startNr: z.string().optional(),
    transponderNr: z.string().optional(),
    chassiNr: z.string().optional(),
    motorNr1: z.string().optional(),
    motorNr2: z.string().optional(),
    driverLicense: z.string().min(1, { message: "Førerlisens er påkrevd." }),
    vehicleLicense: z.string().optional(),
    teamLicense: z.string().optional(),
    guardians: z.array(guardianSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DriverFormProps {
    driverToEdit?: Driver | null;
    onSave: (data: Omit<Driver, 'id' | 'role' | 'authUid'>, id?: string) => void;
    closeDialog: () => void;
    rfidFromScan?: string;
    isRestrictedView?: boolean;
}

export function DriverForm({ driverToEdit, onSave, closeDialog, rfidFromScan, isRestrictedView = false }: DriverFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: driverToEdit ? {
            ...driverToEdit,
            dob: driverToEdit.dob ? format(parseDateString(driverToEdit.dob)!, 'dd.MM.yyyy') : '',
            email: driverToEdit.email || "",
            rfid: driverToEdit.rfid || "",
            hasSeasonPass: driverToEdit.hasSeasonPass || false,
            klasse: driverToEdit.klasse || "",
            startNr: driverToEdit.startNr || "",
            transponderNr: driverToEdit.transponderNr || "",
            chassiNr: driverToEdit.chassiNr || "",
            motorNr1: driverToEdit.motorNr1 || "",
            motorNr2: driverToEdit.motorNr2 || "",
            driverLicense: driverToEdit.driverLicense || "",
            vehicleLicense: driverToEdit.vehicleLicense || "",
            teamLicense: driverToEdit.teamLicense || "",
            guardians: driverToEdit.guardians?.map(g => ({
                ...g,
                licenses: g.licenses?.map(l => ({ value: l })) || []
            })) || [],
        } : {
            rfid: rfidFromScan || "",
            name: "",
            email: "",
            club: "",
            dob: "",
            hasSeasonPass: false,
            klasse: "",
            startNr: "",
            transponderNr: "",
            chassiNr: "",
            motorNr1: "",
            motorNr2: "",
            driverLicense: "",
            vehicleLicense: "",
            teamLicense: "",
            guardians: [],
        },
    });

    const { fields: guardianFields, append: appendGuardian, remove: removeGuardian } = useFieldArray({
        control: form.control,
        name: "guardians",
    });

    const teamLicense = form.watch("teamLicense");
    
    function onSubmit(values: FormValues) {
        const parsedDate = values.dob ? parseDateString(values.dob) : null;
        if (values.dob && !parsedDate) {
            form.setError("dob", { type: "manual", message: "Ugyldig dato."});
            return;
        }

        const driverData: Omit<Driver, 'id' | 'role' | 'authUid'> = {
            rfid: values.rfid,
            email: values.email || '',
            name: values.name,
            dob: parsedDate ? format(parsedDate, "yyyy-MM-dd") : '',
            club: values.club,
            hasSeasonPass: values.hasSeasonPass,
            klasse: values.klasse,
            startNr: values.startNr,
            transponderNr: values.transponderNr,
            chassiNr: values.chassiNr,
            motorNr1: values.motorNr1,
            motorNr2: values.motorNr2,
            driverLicense: values.driverLicense,
            vehicleLicense: values.vehicleLicense,
            teamLicense: values.teamLicense,
            guardians: values.guardians?.map(g => ({
                ...g,
                licenses: g.licenses?.map(l => l.value).filter(Boolean) || []
            })) || [],
        };
        
        onSave(driverData, values.id);
        // closeDialog(); // Let the parent component handle closing
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
                                            readOnly={!!driverToEdit?.email && !isRestrictedView}
                                            className={cn(!!driverToEdit?.email && !isRestrictedView && "cursor-not-allowed opacity-70")}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Søsken som registreres med samme e-post vil bli knyttet til samme innlogging.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dob"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Fødselsdato (Valgfri)</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="DD.MM.YYYY"
                                        {...field}
                                        value={field.value ?? ''}
                                    />
                                </FormControl>
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
                            name="transponderNr"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transponder nr</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Transpondernummer" {...field} value={field.value ?? ''} />
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
                         <FormField
                            control={form.control}
                            name="chassiNr"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chassi nr</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Chassisnummer" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="motorNr1"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motor nr 1</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Motornummer 1" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="motorNr2"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motor nr 2</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Motornummer 2" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     {!isRestrictedView && (
                        <div className="md:col-span-2">
                            <FormField
                                control={form.control}
                                name="hasSeasonPass"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Årskort</FormLabel>
                                            <FormDescription>
                                                Angir om føreren har betalt for årskort. Hvis aktiv, vil betalingssteget hoppes over ved innsjekk.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
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
                                    Hvis denne er fylt ut, overstyrer den informasjon om foresatte for førere under 18.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className={cn("transition-opacity", !!teamLicense && "opacity-50 pointer-events-none")}>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Foresattes Informasjon</h3>
                            <div className="space-y-6">
                                {guardianFields.map((guardian, index) => (
                                    <GuardianFormSection key={guardian.id} index={index} removeGuardian={removeGuardian} form={form} />
                                ))}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendGuardian({ id: crypto.randomUUID(), name: "", contact: "", licenses: [] })}
                                className="mt-4"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Legg til foresatt
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                    <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        {driverToEdit ? 'Lagre Endringer' : 'Registrer Fører'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}


interface GuardianFormSectionProps {
    index: number;
    removeGuardian: (index: number) => void;
    form: any;
}

function GuardianFormSection({ index, removeGuardian, form }: GuardianFormSectionProps) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `guardians.${index}.licenses`
    });

    return (
        <div className="p-4 bg-muted/50 rounded-lg border relative">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeGuardian(index)}
                className="absolute top-2 right-2 h-7 w-7"
            >
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name={`guardians.${index}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Foresattes Navn</FormLabel>
                            <FormControl>
                                <Input placeholder="Kari Nordmann" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`guardians.${index}.contact`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Foresattes Kontaktinfo</FormLabel>
                            <FormControl>
                                <Input placeholder="+47 123 45 678" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="space-y-2 pt-4">
                <FormLabel>Foresattes Lisenser</FormLabel>
                {fields.map((field, licenseIndex) => (
                    <FormField
                        key={field.id}
                        control={form.control}
                        name={`guardians.${index}.licenses.${licenseIndex}.value`}
                        render={({ field: licenseField }) => (
                            <FormItem>
                                <div className="flex items-center gap-2">
                                    <FormControl>
                                        <Input placeholder={`Lisensnummer ${licenseIndex + 1}`} {...licenseField} />
                                    </FormControl>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(licenseIndex)}>
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
    );
}

