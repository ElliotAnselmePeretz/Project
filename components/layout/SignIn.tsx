import { signIn, signOut } from "@/lib/auth";
import { Button } from "@/components/ui";

export function SignIn() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("microsoft-entra-id", { redirectTo: "/" });
      }}
    >
      <Button type="submit" variant="primary">
        Sign in with Microsoft
      </Button>
    </form>
  );
}

export function SignOut() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        Sign out
      </Button>
    </form>
  );
}
