
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "@/services/auth-service";
import { getFirebaseDriversByAuthUid, getFirebaseDriverById } from "@/services/firebase-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, LogIn, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { useRouter } from "next/navigation";

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
      
      // Try fetching profile by user.uid first (for admin accounts)
      let profile = await getFirebaseDriverById(user.uid);

      if (profile && profile.role === 'admin') {
          toast({ title: "Admin-innlogging Vellykket" });
          router.push('/admin');
          return;
      }
      
      // If not an admin profile, check for driver profiles via authUid
      const driverProfiles = await getFirebaseDriversByAuthUid(user.uid);

      if (!driverProfiles || driverProfiles.length === 0) {
        toast({
            variant: "destructive",
            title: "Profil Mangler",
            description: "Fant ingen førerprofil knyttet til denne innloggingen.",
        });
        return; 
      }
      
      if (driverProfiles.length > 1) {
        // Multiple drivers associated, redirect to selection page
        router.push(`/velg-forer?authUid=${user.uid}`);
      } else {
        // Single driver, go directly to their profile
        toast({ title: "Innlogging Vellykket" });
        router.push(`/driver/${driverProfiles[0].id}`);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Innlogging Feilet",
        description: "E-post eller passord er feil. Vennligst prøv igjen.",
      });
    } finally {
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
