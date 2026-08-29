// Layout racine minimal — le vrai contenu (polices, traductions) vit dans
// app/[locale]/layout.tsx. Next.js impose un layout racine avec <html>/<body>.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
