"use client";

import { createContext, useContext, type ReactNode } from "react";

interface UserContextValue {
  user: { username: string; role: "admin" | "user" } | null;
}

const UserContext = createContext<UserContextValue>({ user: null });

export function UserProvider({
  user,
  children,
}: {
  user: { username: string; role: "admin" | "user" } | null;
  children: ReactNode;
}) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
