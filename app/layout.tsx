// Root layout - minimal wrapper; locale layout handles HTML shell
// This is required by Next.js but content is rendered by app/[locale]/layout.tsx

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
