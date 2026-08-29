import { Role } from "@/lib/enums";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      ageVerified: boolean;
    };
  }

  interface User {
    id: string;
    role: Role;
    ageVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    ageVerified: boolean;
  }
}
