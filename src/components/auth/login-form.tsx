"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn, signOut } from "@/services/auth-service";
import { getDriverById, addDriver } from "@/services/driver-service";
import type { Driver } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, LogIn, ArrowLeft } from "lucide-react";
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: "Ugyldig e-postadresse." }),
  password: z.string().min(1, { message: "Passord er påkrevd." }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const user = await signIn(values.email, values.password);
      let profile = await getDriverById(user.uid);

      if (!profile) {
        // IMPORTANT: Change this email to your own admin email to auto-create your profile on first login.
        const ADMIN_EMAIL = 'jingebretsen89@gmail.com';

        if (values.email.toLowerCase() === ADMIN_EMAIL) {
          const newAdminProfile: Driver = {
            id: user.uid,
            rfid: `admin_${user.uid.slice(0, 8)}`,
            email: values.email,
            name: 'Admin',
            dob: '2000-01-01',
            club: 'System Admin',
            role: 'admin',
          };
          await addDriver(newAdminProfile);
          profile = newAdminProfile;
          toast({
            title: "Admin-profil Opprettet",
            description: "En ny admin-profil er opprettet for deg.",
          });
        }
      }

      if (profile?.role === 'admin') {
        toast({ title: "Admin-innlogging Vellykket" });
        router.push('/admin');
      } else if (profile) {
        toast({ title: "Innlogging Vellykket" });
        router.push(`/driver/${user.uid}`);
      } else {
        toast({
          variant: "destructive",
          title: "Profil Mangler",
          description: "Brukeren din er ikke koblet til en profil. Kontakt administrator.",
        });
        await signOut();
        setIsLoading(false);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Innlogging Feilet",
        description: "E-post eller passord er feil. Vennligst prøv igjen.",
      });
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-post</FormLabel>
              <FormControl>
                <Input type="email" placeholder="din@epost.no" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passord</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          Logg inn
        </Button>
        <Button asChild variant="outline" className="w-full" disabled={isLoading}>
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake til forsiden
            </Link>
        </Button>
      </form>
    </Form>
  );
}
