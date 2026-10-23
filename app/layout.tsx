import Link from "next/link";
import "./globals.css";

export const metadata = { title: "Expense Approval" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <strong>Expenses</strong>
          <Link href="/requests">My Requests</Link>
          <Link href="/approvals">Approval Queue</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
