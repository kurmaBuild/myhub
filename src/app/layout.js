import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata = {
  title: "My hub",
  description: "used by kurma",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
