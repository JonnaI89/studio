"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Driver } from "@/lib/types";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
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
    name: z.string().min(2, { message: "Navn må ha minst 2 tegn." }),
    dob: z.date({ required_error: "Fødselsdato er påkrevd." }),
    club: z.string().min(2, { message: "Klubb må ha minst 2 tegn." }),
    guardianName: z.string().optional(),
    guardianContact: z.string().optional(),
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

interface RegisterDriverFormProps {
    rfid: string;
    onRegister: (newDriver: Driver) => void;
    closeDialog: () => void;
}

export function RegisterDriverForm({ rfid, onRegister, closeDialog }: RegisterDriverFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            club: "",
            guardianName: "",
            guardianContact: "",
        },
    });

    const [isUnderage, setIsUnderage] = useState(false);
    
    const handleDobChange = (date: Date | undefined) => {
        if (date) {
            form.setValue("dob", date, { shouldValidate: true });
            setIsUnderage(calculateAge(date) < 18);
        }
    };

    function onSubmit(values: z.infer<typeof formSchema>) {
        const newDriver: Driver = {
            id: rfid,
            name: values.name,
            dob: format(values.dob, "yyyy-MM-dd"),
            club: values.club,
        };

        if (isUnderage && values.guardianName && values.guardianContact) {
            newDriver.guardian = {
                name: values.guardianName,
                contact: values.guardianContact,
            };
        }
        
        onRegister(newDriver);
        closeDialog();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
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
                </div>
                
                {isUnderage && (
                    <>
                        <Separator />
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                            <h3 className="font-semibold text-amber-600">Fører er under 18 år</h3>
                            <p className="text-sm text-muted-foreground">
                                Informasjon om foresatt er påkrevd.
                            </p>
                            <FormField
                                control={form.control}
                                name="guardianName"
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
                                name="guardianContact"
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
                    </>
                )}
                 {form.formState.errors.guardianName && (
                    <FormMessage>{form.formState.errors.guardianName.message}</FormMessage>
                )}

                <div className="flex justify-between items-center pt-4">
                    <div>
                        <p className="text-sm font-medium">RFID</p>
                        <p className="text-sm text-muted-foreground">{rfid}</p>
                    </div>
                    <Button type="submit">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Registrer Fører
                    </Button>
                </div>
            </form>
        </Form>
    );
}
