import Link from "next/link";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

export const metadata = { title: "Expense Approval" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <nav>
            <strong>Expenses</strong>
            <Link href="/requests">My Requests</Link>
            <Link href="/approvals">Approval Queue</Link>
          </nav>
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
