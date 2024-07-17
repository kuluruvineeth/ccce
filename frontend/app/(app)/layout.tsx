import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AppAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/");
  }

  const dbUser = await fetch(
    `https://database.cestorage.workers.dev/api/user?id=${user.id}`
  );

  const dbUserJSON = await dbUser.json();

  if (!dbUserJSON.id) {
    const res = await fetch("https://database.cestorage.workers.dev/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: user.id,
        name: user.firstName + " " + user.lastName,
        email: user.emailAddresses[0].emailAddress,
      }),
    });
  } else {
  }

  return <>{children}</>;
}
